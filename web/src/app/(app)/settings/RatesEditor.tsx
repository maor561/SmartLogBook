'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import { GROUPS, FIELDS, LABEL } from '@/lib/rates/catalogue';
import { getAt, DEFAULTS, type RateParams } from '@/lib/rates/params';
import type { RateVersion } from '@/lib/settings';
import { saveRateVersion } from './actions';

type Props = { versions: RateVersion[]; currentId: number };
type Values = Record<string, string>;

const toValues = (p: RateParams): Values => Object.fromEntries(FIELDS.map((f) => [f.path, String(getAt(p, f.path))]));
const date = (iso: string) => new Date(iso).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });

// Sketch s6: grouped editor; saving creates a new immutable version (ADR-021, 041).
export function RatesEditor({ versions, currentId }: Props) {
  const current = versions.find((v) => v.id === currentId)!;
  const saved = useMemo(() => toValues(current.params), [current]);
  const [values, setValues] = useState<Values>(saved);
  const [showHist, setShowHist] = useState(false);
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [toast, setToast] = useState('');
  const [pending, start] = useTransition();
  const dlg = useRef<HTMLDialogElement>(null);

  // After a save the server sends a new current version; reset the form to it.
  const [seenId, setSeenId] = useState(currentId);
  if (seenId !== currentId) { setSeenId(currentId); setValues(saved); }

  const changes = FIELDS.filter((f) => values[f.path].trim() !== '' && Number(values[f.path]) !== Number(saved[f.path]))
    .map((f) => ({ path: f.path, from: saved[f.path], to: values[f.path] }));
  const changed = new Set(changes.map((c) => c.path));
  const versionNo = (id: number) => versions.length - versions.findIndex((v) => v.id === id);
  const nextNo = versions.length + 1;

  function confirm() {
    const payload = Object.fromEntries(changes.map((c) => [c.path, Number(c.to)]));
    start(async () => {
      const res = await saveRateVersion(payload, note);
      if (!res.ok) { setErrors(res.errors); return; }
      setErrors([]); setNote(''); dlg.current?.close();
      setToast(`נוצרה גרסה ${nextNo}. חלה מהטיסה הבאה.`);
      setTimeout(() => setToast(''), 2600);
    });
  }

  return (
    <>
      <section className="panel">
        <div className="panel-head">
          <span className="label">תעריפים</span>
          <span className="small">כל המקדמים של מנוע החישוב. שינוי יוצר גרסה חדשה; טיסות קיימות נשארות על הגרסה שלהן.</span>
        </div>
        <div className="ver">
          <span className="label">גרסה פעילה</span>
          <b>גרסה {versionNo(currentId)}</b>
          <span className="chip go">פעילה</span>
          <span className="small">מאז {date(current.createdAt)} · {current.flights} טיסות</span>
          <button type="button" className="btn-link" style={{ marginInlineStart: 'auto' }} onClick={() => setShowHist((s) => !s)}>
            היסטוריית גרסאות {showHist ? '▴' : '▾'}
          </button>
        </div>
        {showHist && (
          <div className="hist">
            <table className="tbl">
              <thead><tr><th>גרסה</th><th>מתאריך</th><th className="opt">הערה</th><th>טיסות</th><th /></tr></thead>
              <tbody>
                {versions.map((v) => (
                  <tr key={v.id}>
                    <td><b>גרסה {versionNo(v.id)}</b> {v.id === currentId && <span className="chip go">פעילה</span>}</td>
                    <td>{date(v.createdAt)}</td>
                    <td className="opt small">{v.note}</td>
                    <td>{v.flights}</td>
                    <td>{v.id !== currentId && (
                      <button type="button" className="btn-link" onClick={() => setValues(toValues(v.params))}>טען לעריכה</button>
                    )}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="groups">
        {GROUPS.map((g) => {
          const n = g.items.filter((i) => 'path' in i && changed.has(i.path)).length;
          return (
            <details key={g.title} className="g" open={g.open}>
              <summary>
                <span className="g-title">{g.title}</span>
                {n > 0 && <span className="chip warn">{n} שונו</span>}
                <span className="g-formula">{g.formula}</span>
              </summary>
              <div className="g-body">
                {g.items.map((i) => 'heading' in i ? <div key={i.heading} className="sub-h">{i.heading}</div> : (
                  <label key={i.path} className={`p${changed.has(i.path) ? ' changed' : ''}`}>
                    <span className="row"><span className="name">{i.name}</span><span className="unit">{i.unit}</span></span>
                    <input inputMode="decimal" value={values[i.path]} onChange={(e) => setValues({ ...values, [i.path]: e.target.value })} />
                    <span className="row">
                      <span className="def">ברירת מחדל <bdi className="ltr">{getAt(DEFAULTS, i.path)}</bdi></span>
                      {changed.has(i.path) && (
                        <button type="button" className="btn-link" onClick={() => setValues({ ...values, [i.path]: saved[i.path] })}>↺ הקודם</button>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            </details>
          );
        })}
      </div>

      {changes.length > 0 && (
        <div className="savebar">
          <span className="chip warn">{changes.length === 1 ? 'שינוי אחד' : `${changes.length} שינויים`}</span>
          <span className="grow small">לא נשמר. השמירה יוצרת <b>גרסה {nextNo}</b>, שתחול מהטיסה הבאה.</span>
          <button type="button" className="btn btn-sm" onClick={() => setValues(saved)}>בטל שינויים</button>
          <button type="button" className="btn btn-sm btn-primary" onClick={() => { setErrors([]); dlg.current?.showModal(); }}>שמור…</button>
        </div>
      )}

      <dialog ref={dlg} className="dlg">
        <div className="dh">שמירת גרסה {nextNo}</div>
        <div className="db">
          <table className="tbl">
            <thead><tr><th>מקדם</th><th>היה</th><th>יהיה</th></tr></thead>
            <tbody>{changes.map((c) => (
              <tr key={c.path}><td>{LABEL[c.path]}</td><td className="n">{c.from}</td><td className="n"><b>{c.to}</b></td></tr>
            ))}</tbody>
          </table>
          <label className="field"><span>הערה לגרסה (לא חובה)</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="למשל: חכירה לפי מחירי 2027" />
          </label>
          <div className="note">חל מהטיסה הבאה. טיסות שכבר נסגרו לא משתנות. טיסה שבאוויר עכשיו נשארת על הגרסה שהייתה ב-OUT.</div>
          {errors.map((e) => <div key={e} className="err">{e}</div>)}
        </div>
        <div className="df">
          <button type="button" className="btn btn-sm btn-primary" disabled={pending} onClick={confirm}>{pending ? 'שומר…' : 'צור גרסה'}</button>
          <button type="button" className="btn btn-sm" onClick={() => dlg.current?.close()}>ביטול</button>
        </div>
      </dialog>

      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}
