'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { compute, type LedgerCode } from '@/lib/engine';
import { missing, toEngineInput, TIME_LABEL, type Draft, type Times } from '@/lib/flight-input';
import type { FormView } from '@/lib/flight-view';
import { hm, minsBetween, usd, z } from '@/lib/format';
import { closeFlight, discardFlight } from '../flight-actions';
import { Head } from './Parts';

const LABEL: Record<LedgerCode, string> = {
  tickets: 'כרטיסים', cargo: 'מטען', fuel: 'דלק', ground_handling: 'צוות קרקע', catering: 'קייטרינג',
  crew: 'טייסים ודיילים', maintenance: 'תחזוקה', airport_fees: 'עמלות נחיתה ושדה', nav_charges: 'דמי ניווט',
  lease: 'חכירת מטוס', hard_landing: 'קנס נחיתה קשה', positioning: 'הקפצת צוות', diversion: 'הסטה',
};
const SRC = { manual: ['ידני', 'm'], auto: ['אוטו׳', 'a'], simbrief: ['SimBrief', ''] } as const;
const KEYS = ['out', 'off', 'on', 'in'] as const;

// "HH:MM" → ISO, on the first date at or after `anchor` (flights cross midnight).
function toIso(hhmm: string, anchor: string | null): string | null {
  const m = /^(\d{1,2}):?(\d{2})$/.exec(hhmm.trim());
  if (!m || +m[1] > 23 || +m[2] > 59 || !anchor) return null;
  const a = new Date(anchor);
  const d = new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate(), +m[1], +m[2]));
  if (d.getTime() < a.getTime() - 6 * 3600e3) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString();
}

const num = (s: string) => (s.trim() === '' || Number.isNaN(Number(s.replace(/,/g, ''))) ? null : Number(s.replace(/,/g, '')));

function fpmHint(fpm: number | null, p: FormView['params']) {
  if (fpm == null) return null;
  const a = Math.abs(fpm), h = p.hardLanding;
  if (a <= h.freeUpToFpm) return ['go', a <= 200 ? 'נחיתה רכה · אין קנס' : 'נחיתה רגילה · אין קנס'];
  if (a <= h.visualUpToFpm) return ['warn', 'בדיקה ויזואלית · קנס'];
  if (a <= h.ammUpToFpm) return ['bad', 'בדיקת נחיתה קשה (AMM) · קנס'];
  return ['bad', 'בדיקה מבנית · קנס כבד'];
}

export function CompletionForm({ form, crewIcao }: { form: FormView; crewIcao: string }) {
  const router = useRouter();
  const { ofp, tracked, params } = form;
  const interrupted = form.trackerState === 'interrupted';
  const [hhmm, setHhmm] = useState<Record<string, string>>({ out: '', off: '', on: '', in: '' });
  // Start from the GSX costs entered during the flight, if any.
  const str = (v: number | null | undefined) => (v == null ? '' : String(v));
  const [money, setMoney] = useState({ fuel: str(form.draft?.fuel), ground: str(form.draft?.ground), catering: str(form.draft?.catering) });
  const [fpmText, setFpmText] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, start] = useTransition();

  // Final times: measured ones are locked; the rest come from the inputs, each
  // anchored on the previous time (or the scheduled OUT for the first one).
  const times = useMemo(() => {
    const t: Times = { out: null, off: null, on: null, in: null };
    let anchor: string | null = ofp.sched.out ?? tracked.out;
    for (const k of KEYS) {
      t[k] = tracked[k] ?? toIso(hhmm[k], anchor);
      if (t[k]) anchor = t[k];
    }
    return t;
  }, [hhmm, tracked, ofp.sched.out]);

  const fpm = num(fpmText);
  const draft: Draft = {
    ofp, times, fpm: fpm == null ? null : Math.round(fpm),
    manual: { fuel: num(money.fuel), ground: num(money.ground), catering: num(money.catering) },
    fuelUsdPerKg: form.fuel?.usdPerKg ?? null, rating: form.rating,
    positioningNm: form.positioningNm, diversionNm: form.diverted ? form.diversionNm : null,
  };
  const gaps = missing(draft);
  const input = toEngineInput(draft);
  const result = input ? compute(params, input) : null;
  const revenue = result?.lines.filter((l) => l.amountCents > 0) ?? [];
  const costs = result?.lines.filter((l) => l.amountCents < 0) ?? [];
  const sum = (ls: typeof revenue) => ls.reduce((s, l) => s + l.amountCents, 0);
  const hint = fpmHint(draft.fpm, params);
  const allTracked = KEYS.every((k) => tracked[k]);
  // A time that rolled over to the next UTC day (e.g. IN 00:20 after ON 23:50) is flagged, so a typo stands out.
  const day0 = (times.out ?? ofp.sched.out ?? '').slice(0, 10);
  const nextDay = (iso: string | null) => Boolean(iso && day0 && iso.slice(0, 10) > day0);

  function submit() {
    setErrors([]);
    start(async () => {
      const r = await closeFlight({ ofpId: ofp.id, manualMode: form.mode === 'manual', times, manual: draft.manual, fpm: draft.fpm });
      if (!r.ok) setErrors(r.errors);
      else router.replace('/');
    });
  }
  function discard() {
    if (!confirm('למחוק את הטיסה? היא לא תירשם בלוגבוק.')) return;
    start(async () => {
      const r = await discardFlight(ofp.id);
      if (!r.ok) setErrors(r.errors); else router.replace('/');
    });
  }

  const tag = form.mode === 'tracked'
    ? <span className="tag warn">ממתינה להשלמה</span>
    : interrupted ? <span className="tag bad">קטועה</span> : <span className="tag warn">השלמה ידנית</span>;

  return (
    <div className="main wide">
      <div className="stack">
        <section className="panel">
          <Head ofp={ofp} tag={tag} actual={form.actual} diverted={form.diverted}>
            {form.mode === 'tracked'
              ? <>GATE · <bdi>{z(tracked.in)}Z</bdi> <span className="chip plan">נעקבה</span></>
              : <span className="chip warn">{Object.values(tracked).some(Boolean) ? 'תירשם כחלקית' : 'תירשם כידנית'}</span>}
          </Head>

          {form.diverted && form.actual && (
            <div className="banner warn">
              <div className="grow"><b>נחתת ב-<bdi>{form.actual.icao}</bdi> במקום <bdi>{ofp.dest.icao}</bdi>.</b> הטיסה תירשם ל-<bdi>{form.actual.icao}</bdi>, ותתווסף הוצאת הסטה: העברת {ofp.weights.pax} נוסעים ל-<bdi>{ofp.dest.icao}</bdi>. הטיסה הבאה ממשיכה מ-<bdi>{form.actual.icao}</bdi>.</div>
            </div>
          )}
          {interrupted && (
            <div className="banner bad">
              <div className="grow"><b>החיבור אבד ב-<bdi>{z(form.disconnectedAt)}Z</bdi> ולא חזר תוך 30 דקות.</b> השלם את הזמנים החסרים כדי לרשום את הטיסה, או מחק אותה.</div>
            </div>
          )}

          <div className="form">
            <div className="fgroup-title">זמני בלוק · UTC{allTracked ? ' · VATSIM' : ''}</div>
            <div className="fields">
              {KEYS.map((k) => (
                <div key={k} className="ff">
                  <label htmlFor={`t-${k}`}>{TIME_LABEL[k]}</label>
                  {tracked[k] ? (
                    <div className="in locked"><b>{z(tracked[k])}</b></div>
                  ) : (
                    <div className="in"><input id={`t-${k}`} inputMode="numeric" placeholder="HH:MM" value={hhmm[k]} onChange={(e) => setHhmm({ ...hhmm, [k]: e.target.value })} /></div>
                  )}
                  {!allTracked && (
                    <div className={`hint${nextDay(times[k]) ? ' warn' : ''}`}>
                      {tracked[k] ? 'VATSIM' : 'ידני'}{nextDay(times[k]) && ' · +1 יום'}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="small">
              בלוק <b style={{ color: 'var(--ink)' }}>{hm(minsBetween(times.out, times.in))}</b> · באוויר <b style={{ color: 'var(--ink)' }}>{hm(minsBetween(times.off, times.on))}</b>
              {allTracked ? ' · נעקב במלואו, לא ניתן לעריכה'
                : KEYS.some((k) => tracked[k]) ? ' · הזמנים שנמדדו ב-VATSIM נעולים'
                : ' · טיסה ידנית: כל הזמנים מוזנים ידנית'}
            </div>

            <div className="fgroup-title">מ-GSX Pro</div>
            <div className="fields f3">
              {([['fuel', 'דלק'], ['ground', 'צוות קרקע'], ['catering', 'קייטרינג']] as const).map(([k, label]) => (
                <div key={k} className="ff">
                  <label htmlFor={`m-${k}`}>{label}</label>
                  <div className="in"><span className="u">$</span><input id={`m-${k}`} inputMode="decimal" placeholder="0" value={money[k]} onChange={(e) => setMoney({ ...money, [k]: e.target.value })} /></div>
                </div>
              ))}
            </div>

            <div className="fgroup-title">נחיתה</div>
            <div className="fields">
              <div className="ff">
                <label htmlFor="fpm">FPM בנגיעה</label>
                <div className="in"><input id="fpm" inputMode="numeric" placeholder="-000" value={fpmText} onChange={(e) => setFpmText(e.target.value)} /></div>
                {hint && <div className={`hint ${hint[0]}`}>{hint[1]}</div>}
              </div>
            </div>
          </div>

          <div className="actions">
            <button type="button" className="btn btn-primary" disabled={pending || gaps.length > 0} onClick={submit}>
              {pending ? 'שומר…' : 'סגור טיסה ורשום ללוגבוק'}
            </button>
            <span className="small">{gaps.length ? `חסרים: ${gaps.join(', ')}` : 'אחרי הסגירה הסכומים ננעלים (ADR-007)'}</span>
            {interrupted && <button type="button" className="btn btn-ghost-bad end" disabled={pending} onClick={discard}>מחק טיסה</button>}
          </div>
          {errors.length > 0 && <div className="pb err" role="alert">{errors.join(' · ')}</div>}
        </section>
      </div>

      <aside className="stack">
        <section className="panel">
          <div className="panel-head"><span className="label">ספר החשבונות של הטיסה</span><span className="small" style={{ marginInlineStart: 'auto' }}>מתעדכן תוך כדי הקלדה</span></div>
          {!result ? (
            <div className="pb small">יתמלא אחרי שתזין את הזמנים, כי העלויות האוטומטיות תלויות בזמן הבלוק.</div>
          ) : (
            <table className="tbl ledger">
              <tbody>
                <tr className="grp"><td colSpan={2}>הכנסות</td></tr>
                {revenue.map((l) => <Row key={l.code} code={l.code} cents={l.amountCents} source={l.source} />)}
                <tr className="sub"><td>סה״כ הכנסות</td><td className="n pos">{usd(sum(revenue))}</td></tr>
                <tr className="grp"><td colSpan={2}>הוצאות</td></tr>
                {costs.map((l) => <Row key={l.code} code={l.code} cents={l.amountCents} source={l.source} />)}
                {!costs.some((l) => l.code === 'hard_landing') && draft.fpm != null && (
                  <tr className="zero"><td>קנס נחיתה קשה · FPM <bdi>{draft.fpm}</bdi></td><td className="n">$0</td></tr>
                )}
                {!costs.some((l) => l.code === 'positioning') && (
                  <tr className="zero"><td>הקפצת צוות · {form.positioningNm ? `פחות מ-${params.positioning.freeUnderNm} NM` : <>המוצא = מיקום הצוות (<bdi>{crewIcao}</bdi>)</>}</td><td className="n">$0</td></tr>
                )}
                <tr className="sub"><td>סה״כ הוצאות</td><td className="n neg">{usd(sum(costs))}</td></tr>
                <tr className="net"><td>רווח נקי</td><td className={`n ${result.profitCents >= 0 ? 'pos' : 'neg'}`}>{usd(result.profitCents)}</td></tr>
              </tbody>
            </table>
          )}
          <div className="pb small" style={{ borderTop: '1px solid var(--line)' }}>
            מחיר כרטיס <b style={{ color: 'var(--ink)' }}>{result ? `$${result.fare}` : '—'}</b> · תעריפים גרסה {form.rateSetId}
            {form.fuel ? <> · דלק EIA <bdi>${form.fuel.usdPerKg.toFixed(2)}</bdi>/ק״ג</> : ' · בלי מחיר EIA (תוספת 0%)'}
            {form.rating != null ? <> · דירוג <bdi>{form.rating.toFixed(1)}</bdi>★</> : ' · דירוג בבנייה (נייטרלי)'}
          </div>
        </section>
      </aside>
    </div>
  );
}

function Row({ code, cents, source }: { code: LedgerCode; cents: number; source: keyof typeof SRC }) {
  const [txt, cls] = SRC[source];
  return (
    <tr>
      <td>{LABEL[code]}<span className={`srcs ${cls}`}>{txt}</span></td>
      <td className="n">{usd(cents)}</td>
    </tr>
  );
}
