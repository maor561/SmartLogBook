'use client';

import dynamic from 'next/dynamic';
import { useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  applyFilters, filtersToQuery, summarize, tagsOf, SOURCE_LABEL, TAG_LABEL,
  type Filters, type LogFlight, type Period, type Tag,
} from '@/lib/logbook-filter';
import { TIME_LABEL } from '@/lib/flight-input';
import type { ApPoint } from '@/lib/logbook';
import { ddmm, hm, nf, usd, z } from '@/lib/format';
import { deleteFlightAction, editFlightAction, importBackupAction } from './actions';

const RouteMap = dynamic(() => import('./RouteMap').then((m) => m.RouteMap), { ssr: false, loading: () => <div className="lb-empty">טוען מפה…</div> });

const PERIODS: [Period, string][] = [['m', 'החודש'], ['q', '3 חודשים'], ['y', 'השנה'], ['all', 'הכל'], ['custom', 'מותאם…']];
const SRC_CHIP: Record<LogFlight['source'], string> = { tracked: 'plan', partial: 'warn', manual: '', historical: '' };
const TAG_CHIP: Record<Tag, string> = { div: 'warn', pos: 'warn', hard: 'bad', loss: 'bad', edited: '' };
const LINE_LABEL: Record<string, string> = {
  tickets: 'כרטיסים', cargo: 'מטען', fuel: 'דלק', ground_handling: 'צוות קרקע', catering: 'קייטרינג',
  crew: 'טייסים ודיילים', maintenance: 'תחזוקה', airport_fees: 'עמלות נחיתה ושדה', nav_charges: 'דמי ניווט',
  lease: 'חכירת מטוס', hard_landing: 'קנס נחיתה קשה', positioning: 'הקפצת צוות', diversion: 'הסטה', legacy_profit: 'רווח (מערכת ישנה)',
};
const SRCS: Record<string, [string, string]> = { manual: ['ידני', 'm'], auto: ['אוטו׳', 'a'], simbrief: ['SimBrief', ''], legacy: ['ישן', ''] };
const KEYS = ['out', 'off', 'on', 'in'] as const;

type Props = { flights: LogFlight[]; airports: Record<string, ApPoint>; home: string; initial: Filters };

export function Logbook({ flights, airports, home, initial }: Props) {
  const router = useRouter();
  const [f, setF] = useState<Filters>(initial);
  const [now] = useState(() => new Date());
  const [view, setView] = useState<'list' | 'map'>('list');
  const [selId, setSelId] = useState<number | null>(flights[0]?.id ?? null);
  const [drawer, setDrawer] = useState(false);

  const list = useMemo(() => applyFilters(flights, f, now), [flights, f, now]);
  const sum = summarize(list);
  const sel = flights.find((x) => x.id === selId) ?? null;
  const airportsUsed = useMemo(() => [...new Set(flights.flatMap((x) => [x.origin, x.dest]))].sort(), [flights]);
  const aircraft = useMemo(() => [...new Set(flights.map((x) => x.aircraft).filter(Boolean) as string[])].sort(), [flights]);
  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const q = filtersToQuery(f);

  // Keep the URL in step so a reload (or a shared link) keeps the filters.
  function update(next: Filters) {
    setF(next);
    const s = filtersToQuery(next);
    window.history.replaceState(null, '', s ? `/logbook?${s}` : '/logbook');
  }

  return (
    <div className="lb-shell">
      <div className="toolbar">
        <label className="search"><span aria-hidden>⌕</span><input value={f.q} onChange={(e) => update({ ...f, q: e.target.value })} placeholder="חיפוש: אות קריאה, ICAO, רישום" aria-label="חיפוש" /></label>
        <div className="seg" role="group" aria-label="תקופה">
          {PERIODS.map(([p, label]) => <button key={p} type="button" aria-pressed={f.period === p} onClick={() => update({ ...f, period: p })}>{label}</button>)}
        </div>
        {f.period === 'custom' && (
          <>
            <input type="date" className="date-in" value={f.from} onChange={(e) => update({ ...f, from: e.target.value })} aria-label="מתאריך" />
            <input type="date" className="date-in" value={f.to} onChange={(e) => update({ ...f, to: e.target.value })} aria-label="עד תאריך" />
          </>
        )}
        <select className="sel" value={f.airport} onChange={(e) => update({ ...f, airport: e.target.value })} aria-label="שדה">
          <option value="">כל השדות</option>
          {airportsUsed.map((a) => <option key={a} value={a}>{a}{airports[a]?.name ? ` · ${airports[a].name}` : ''}</option>)}
        </select>
        <select className="sel" value={f.aircraft} onChange={(e) => update({ ...f, aircraft: e.target.value })} aria-label="מטוס">
          <option value="">כל המטוסים</option>
          {aircraft.map((a) => <option key={a}>{a}</option>)}
        </select>
        <div className="tb-end">
          <div className="seg" role="group" aria-label="תצוגה">
            <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}>רשימה</button>
            <button type="button" aria-pressed={view === 'map'} onClick={() => setView('map')}>מפה</button>
          </div>
          <a className="btn btn-sm" href={`/api/logbook/export${q ? `?${q}` : ''}`}>ייצוא Excel</a>
          <ImportButton onDone={() => router.refresh()} />
        </div>
        <div className="tb-row">
          <span className="label">מקור:</span>
          {(['tracked', 'partial', 'manual', 'historical'] as const).map((s) => (
            <button key={s} type="button" className="tgl" aria-pressed={f.sources.includes(s)} onClick={() => update({ ...f, sources: toggle(f.sources, s) })}>{SOURCE_LABEL[s]}</button>
          ))}
          <span className="label" style={{ marginInlineStart: 12 }}>תגים:</span>
          {(Object.keys(TAG_LABEL) as Tag[]).map((t) => (
            <button key={t} type="button" className="tgl" aria-pressed={f.tags.includes(t)} onClick={() => update({ ...f, tags: toggle(f.tags, t) })}>{TAG_LABEL[t]}</button>
          ))}
        </div>
      </div>

      <div className="sum">
        <div><div className="label">טיסות</div><div className="v">{sum.flights}</div></div>
        <div><div className="label">שעות בלוק</div><div className="v">{hm(sum.blockMin)}</div></div>
        <div><div className="label">רווח נקי</div><div className={`v ${sum.profitCents < 0 ? 'neg' : 'pos'}`}><bdi className="ltr">{usd(sum.profitCents)}</bdi></div></div>
        <div><div className="label">ממוצע לטיסה</div><div className="v"><bdi className="ltr">{sum.avgCents == null ? '—' : usd(sum.avgCents)}</bdi></div></div>
        <div><div className="label">נוסעים</div><div className="v">{nf(sum.pax)}</div></div>
      </div>

      {view === 'list' ? (
        <div className="lb">
          <div className="list">
            {flights.length === 0 ? (
              <div className="lb-empty">הלוגבוק ריק. טיסות שייסגרו במסך ״טיסה״ יופיעו כאן.</div>
            ) : (
              <table className="tbl">
                <thead><tr><th>תאריך</th><th className="hide-m">אות קריאה</th><th>מסלול</th><th className="hide-m">מטוס</th><th className="n">בלוק</th><th className="n hide-m">FPM</th><th className="hide-m">מקור ותגים</th><th className="n">רווח / הפסד</th></tr></thead>
                <tbody className="rows">
                  {list.map((x) => (
                    <tr key={x.id} aria-selected={x.id === selId} onClick={() => { setSelId(x.id); setDrawer(true); }}>
                      <td>{ddmm(x.date)}</td>
                      <td className="hide-m"><bdi>{x.callsign ?? '—'}</bdi></td>
                      <td><bdi>{x.origin}</bdi> ← <bdi>{x.dest}</bdi></td>
                      <td className="hide-m">{x.aircraft ?? '—'}</td>
                      <td className="n">{hm(x.blockMin)}</td>
                      <td className={`n hide-m${x.fpm != null && Math.abs(x.fpm) > 400 ? ' neg' : ''}`}>{x.fpm ?? '—'}</td>
                      <td className="hide-m"><Chips f={x} /></td>
                      <td className={`n ${x.profitCents < 0 ? 'neg' : 'pos'}`}>{usd(x.profitCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {flights.length > 0 && list.length === 0 && <div className="lb-empty">אין טיסות שעונות על הסינון</div>}
          </div>
          <aside className={`detail${drawer ? ' open' : ''}`}>
            {sel ? <Detail key={sel.id} f={sel} airports={airports} onClose={() => setDrawer(false)} onDeleted={() => { setSelId(null); setDrawer(false); router.refresh(); }} onSaved={() => router.refresh()} />
              : <div className="lb-empty">בחר טיסה מהרשימה</div>}
          </aside>
        </div>
      ) : (
        <RouteMap list={list} airports={airports} home={home} />
      )}
    </div>
  );
}

function Chips({ f }: { f: LogFlight }) {
  return (
    <>
      <span className={`chip ${SRC_CHIP[f.source]}`}>{SOURCE_LABEL[f.source]}</span>
      {tagsOf(f).filter((t) => t !== 'loss').map((t) => <span key={t} className={`chip ${TAG_CHIP[t]}`}>{TAG_LABEL[t]}</span>)}
    </>
  );
}

// ---------- detail drawer

function Detail({ f, airports, onClose, onDeleted, onSaved }: {
  f: LogFlight; airports: Record<string, ApPoint>; onClose: () => void; onDeleted: () => void; onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, start] = useTransition();
  const rev = f.lines.filter((l) => l.cents > 0), exp = f.lines.filter((l) => l.cents < 0);
  const total = (ls: typeof rev) => ls.reduce((s, l) => s + l.cents, 0);
  const ts = f.timesSource ?? '';
  const place = (icao: string) => airports[icao]?.name;

  function remove() {
    if (!confirm(`למחוק את ${f.callsign ?? 'הטיסה'} (${f.origin} ← ${f.dest})? היא תימחק מהלוגבוק ומכל הסיכומים.`)) return;
    start(async () => { const r = await deleteFlightAction(f.id); if (r.ok) onDeleted(); else setErrors(r.errors); });
  }

  return (
    <>
      <div className="d-head">
        <div className="row1">
          <span className="cs"><bdi>{f.callsign ?? '—'}</bdi></span>
          <span className="date">{new Date(f.date).toISOString().slice(0, 10).split('-').reverse().join('.')}</span>
          <Chips f={f} />
          <button type="button" className="btn btn-sm d-close" onClick={onClose}>סגור</button>
        </div>
        <div className="route">
          <bdi>{f.origin}</bdi>{place(f.origin) && <small>{place(f.origin)}</small>}
          <span className="arr">←</span>
          <bdi>{f.dest}</bdi>{place(f.dest) && <small>{place(f.dest)}</small>}
          {f.dest !== f.plannedDest && <s><bdi>{f.plannedDest}</bdi></s>}
        </div>
        <div className="small"><bdi>{[f.aircraft, f.reg].filter(Boolean).join(' · ')}</bdi></div>
      </div>

      {f.editedAt && <div className="edited-note">נערכה ב-{ddmm(f.editedAt)}: ספר החשבונות חושב מחדש לפי התעריפים של יום הסגירה (גרסה {f.rateSetId}).</div>}

      {editing ? (
        <EditForm f={f} onCancel={() => setEditing(false)} onSaved={() => { setEditing(false); onSaved(); }} />
      ) : (
        <>
          <div className="d-sec">
            <div className="panel-head"><span className="label">זמני בלוק · UTC</span>
              {f.source !== 'historical' && <span className="small" style={{ marginInlineStart: 'auto' }}><span className="t-vat">ירוק</span> = VATSIM · <span className="t-man">כתום</span> = ידני</span>}
            </div>
            {f.source === 'historical' ? (
              <div className="pb small">טיסה היסטורית מהמערכת הישנה: אין זמני בלוק. משך מתוכנן {hm(f.airMin)}.</div>
            ) : (
              <table className="tbl">
                <thead><tr><th />{KEYS.map((k) => <th key={k} className="n">{TIME_LABEL[k]}</th>)}</tr></thead>
                <tbody>
                  <tr><td className="muted">מתוכנן</td>{KEYS.map((k) => <td key={k} className="n muted">{z(f.sched[k])}</td>)}</tr>
                  <tr><td>בפועל</td>{KEYS.map((k, i) => <td key={k} className={`n ${ts[i] === 'm' ? 't-man' : 't-vat'}`}>{z(f.times[k])}</td>)}</tr>
                </tbody>
              </table>
            )}
            <div className="facts">
              <div><div className="label">בלוק</div><div className="v">{hm(f.blockMin)}</div></div>
              <div><div className="label">באוויר</div><div className="v">{hm(f.airMin)}</div></div>
              <div><div className="label">FPM</div><div className={`v${f.fpm != null && Math.abs(f.fpm) > 400 ? ' neg' : ''}`}><bdi className="ltr">{f.fpm ?? '—'}</bdi></div></div>
              <div><div className="label">נוסעים</div><div className="v">{nf(f.pax)} {f.seats && <span className="small">/ {f.seats}</span>}</div></div>
              <div><div className="label">מטען</div><div className="v">{nf(f.cargoKg)} <span className="small">ק״ג</span></div></div>
              <div><div className="label">מרחק</div><div className="v">{nf(f.distanceNm)} <span className="small">NM</span></div></div>
            </div>
          </div>

          <div className="d-sec">
            <div className="panel-head"><span className="label">ספר החשבונות</span><span className="small" style={{ marginInlineStart: 'auto' }}>נעול{f.closedAt ? ` · נסגר ${ddmm(f.closedAt)}` : ''}</span></div>
            <table className="tbl ledger">
              <tbody>
                {rev.length > 0 && <tr className="grp"><td colSpan={2}>הכנסות</td></tr>}
                {rev.map((l, i) => <LineRow key={`r${i}`} code={l.code} cents={l.cents} source={l.source} />)}
                {rev.length > 0 && <tr className="sub"><td>סה״כ הכנסות</td><td className="n pos">{usd(total(rev))}</td></tr>}
                {exp.length > 0 && <tr className="grp"><td colSpan={2}>הוצאות</td></tr>}
                {exp.map((l, i) => <LineRow key={`e${i}`} code={l.code} cents={l.cents} source={l.source} />)}
                {exp.length > 0 && <tr className="sub"><td>סה״כ הוצאות</td><td className="n neg">{usd(total(exp))}</td></tr>}
                <tr className="net"><td>{f.profitCents < 0 ? 'הפסד' : 'רווח נקי'}</td><td className={`n ${f.profitCents < 0 ? 'neg' : 'pos'}`}>{usd(f.profitCents)}</td></tr>
              </tbody>
            </table>
          </div>

          <div className="d-actions">
            {f.editable
              ? <button type="button" className="btn btn-sm" onClick={() => setEditing(true)}>ערוך נתונים ידניים</button>
              : <span className="small">{f.source === 'historical' ? 'טיסה היסטורית: לא ניתנת לעריכה' : ''}</span>}
            <button type="button" className="btn btn-sm btn-ghost-bad end" disabled={pending} onClick={remove}>מחק טיסה</button>
          </div>
          {errors.length > 0 && <div className="pb err">{errors.join(' · ')}</div>}
        </>
      )}
    </>
  );
}

function LineRow({ code, cents, source }: { code: string; cents: number; source: string }) {
  const [txt, cls] = SRCS[source] ?? [source, ''];
  return <tr><td>{LINE_LABEL[code] ?? code}<span className={`srcs ${cls}`}>{txt}</span></td><td className="n">{usd(cents)}</td></tr>;
}

// ---------- edit (ADR-021): GSX amounts, FPM, manually entered times only

const hhmmOf = (iso: string | null) => (iso ? z(iso) : '');
function withTime(iso: string, hhmm: string): string | null {
  const m = /^(\d{1,2}):?(\d{2})$/.exec(hhmm.trim());
  if (!m || +m[1] > 23 || +m[2] > 59) return null;
  const d = new Date(iso);
  d.setUTCHours(+m[1], +m[2], 0, 0);
  return d.toISOString();
}

function EditForm({ f, onCancel, onSaved }: { f: LogFlight; onCancel: () => void; onSaved: () => void }) {
  const manualOf = (code: string) => { const l = f.lines.find((x) => x.code === code && x.source === 'manual'); return l ? String(-l.cents / 100) : ''; };
  const [money, setMoney] = useState({ fuel: manualOf('fuel'), ground: manualOf('ground_handling'), catering: manualOf('catering') });
  const [fpm, setFpm] = useState(f.fpm == null ? '' : String(f.fpm));
  const [times, setTimes] = useState<Record<string, string>>(Object.fromEntries(KEYS.map((k) => [k, hhmmOf(f.times[k])])));
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, start] = useTransition();
  const ts = f.timesSource ?? 'vvvv';
  const num = (s: string) => (s.trim() === '' || Number.isNaN(Number(s)) ? null : Number(s));

  function save() {
    // Same calendar day as stored; editing moves the clock time only.
    const t = Object.fromEntries(KEYS.map((k) => [k, f.times[k] ? withTime(f.times[k]!, times[k]) : null])) as Record<(typeof KEYS)[number], string | null>;
    start(async () => {
      const r = await editFlightAction(f.id, {
        times: { out: t.out, off: t.off, on: t.on, in: t.in },
        fpm: num(fpm) == null ? null : Math.round(num(fpm)!),
        fuel: num(money.fuel), ground: num(money.ground), catering: num(money.catering),
      });
      if (r.ok) onSaved(); else setErrors(r.errors);
    });
  }

  return (
    <div className="d-sec">
      <div className="form">
        <div className="small">אפשר לשנות רק מה שהוזן ידנית. ספר החשבונות יחושב מחדש לפי התעריפים של יום הסגירה (גרסה {f.rateSetId}).</div>
        {ts.includes('m') && (
          <>
            <div className="fgroup-title">זמנים שהוזנו ידנית · UTC</div>
            <div className="fields">
              {KEYS.map((k, i) => (
                <div key={k} className="ff">
                  <label>{TIME_LABEL[k]}</label>
                  {ts[i] === 'm'
                    ? <div className="in"><input inputMode="numeric" value={times[k]} onChange={(e) => setTimes({ ...times, [k]: e.target.value })} /></div>
                    : <div className="in locked"><b>{z(f.times[k])}</b></div>}
                </div>
              ))}
            </div>
          </>
        )}
        <div className="fgroup-title">מ-GSX Pro</div>
        <div className="fields f3">
          {([['fuel', 'דלק'], ['ground', 'צוות קרקע'], ['catering', 'קייטרינג']] as const).map(([k, label]) => (
            <div key={k} className="ff"><label>{label}</label><div className="in"><span className="u">$</span><input inputMode="decimal" value={money[k]} onChange={(e) => setMoney({ ...money, [k]: e.target.value })} /></div></div>
          ))}
        </div>
        <div className="fields"><div className="ff"><label>FPM בנגיעה</label><div className="in"><input inputMode="numeric" value={fpm} onChange={(e) => setFpm(e.target.value)} /></div></div></div>
      </div>
      <div className="d-actions">
        <button type="button" className="btn btn-sm btn-primary" disabled={pending} onClick={save}>{pending ? 'שומר…' : 'שמור וחשב מחדש'}</button>
        <button type="button" className="btn btn-sm" onClick={onCancel}>ביטול</button>
      </div>
      {errors.length > 0 && <div className="pb err">{errors.join(' · ')}</div>}
    </div>
  );
}

// ---------- restore (ADR-013)

function ImportButton({ onDone }: { onDone: () => void }) {
  const dlg = useRef<HTMLDialogElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <>
      <button type="button" className="btn btn-sm" onClick={() => { setMsg(null); dlg.current?.showModal(); }}>שחזור</button>
      <dialog ref={dlg} className="dlg">
        <form action={(fd) => start(async () => {
          const r = await importBackupAction(fd);
          setMsg(r.ok ? { ok: true, text: r.message ?? 'בוצע' } : { ok: false, text: r.errors.join(' · ') });
          if (r.ok) onDone();
        })}>
          <div className="dh">שחזור מגיבוי</div>
          <div className="db">
            <div className="small">רק קובץ Excel שיוצא מ-SmartLogBook ולא שונה. טיסות שכבר בלוגבוק לא משתנות; רק טיסות שנמחקו חוזרות. אי אפשר ליצור כך טיסות חדשות (ADR-013).</div>
            <input type="file" name="file" accept=".xlsx" required />
            {msg && <div className={msg.ok ? 'ok' : 'err'}>{msg.text}</div>}
          </div>
          <div className="df">
            <button type="submit" className="btn btn-sm btn-primary" disabled={pending}>{pending ? 'משחזר…' : 'שחזר'}</button>
            <button type="button" className="btn btn-sm" onClick={() => dlg.current?.close()}>סגור</button>
          </div>
        </form>
      </dialog>
    </>
  );
}
