'use client';

import type { FuelResult, FuelStart } from '@/lib/fuel-onboard';

// Fuel on board (sketch s15, ADR-062): what is left at GATE, the tanks before refuelling when the
// previous flight of this registration did not record them, and how the fuel line is reached.
// Used by the completion form and by the logbook's edit form.

export type FuelKgText = { bought: string; remain: string; start: string };

const kg = (v: number) => `${Math.round(v).toLocaleString('en-US')} kg`;
const usd = (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function FuelOnboard({ start, reg, value, onChange, result, startEditable = !start }: {
  start: FuelStart | null; reg: string | null; value: FuelKgText; onChange: (v: FuelKgText) => void; result: FuelResult; startEditable?: boolean;
}) {
  const s = result.ok ? result.state : null;
  return (
    <>
      <div className="fgroup-title">דלק במכלים{reg && <> · <bdi>{reg}</bdi></>}</div>
      <div className="fields">
        {startEditable && (
          <div className="ff">
            <label htmlFor="f-start">דלק במכלים לפני התדלוק</label>
            <div className="in"><span className="u">ק״ג</span><input id="f-start" inputMode="decimal" placeholder="0" value={value.start} onChange={(e) => onChange({ ...value, start: e.target.value })} /></div>
            <div className="hint">{reg ? 'הטיסה הקודמת של המטוס לא רשמה כמה דלק נשאר' : 'אין רישום ב-OFP, ולכן אין רצף בין טיסות'}</div>
          </div>
        )}
        <div className="ff">
          <label htmlFor="f-remain">דלק שנשאר ב-GATE</label>
          <div className="in"><span className="u">ק״ג</span><input id="f-remain" inputMode="decimal" placeholder="0" value={value.remain} onChange={(e) => onChange({ ...value, remain: e.target.value })} /></div>
          <div className="hint">מה-FMC או ממד הדלק, אחרי שעצרת בחניה</div>
        </div>
      </div>
      {s && (
        <div className="fuel-calc">
          <div><span>במכלים לפני התדלוק{start?.from && !startEditable ? <> · נשאר מ-<bdi>{start.from.label}</bdi></> : ' · הוזן'}</span><span className="n">{kg(s.start_kg)} · {usd(s.start_usd)}</span></div>
          <div><span>תודלק בגייט</span><span className="n">{kg(s.bought_kg)} · {usd(s.bought_usd)}</span></div>
          <div><span>במכלים ב-PUSHBACK <span className="muted">· השווה ל-FMC</span></span><span className="n">{kg(s.start_kg + s.bought_kg)}</span></div>
          <div><span>נשאר ב-GATE <span className="muted">· עובר לטיסה הבאה בשווי {usd(s.remain_usd)}</span></span><span className="n">{kg(s.remain_kg)}</span></div>
          <div className="tot"><span>נשרף בטיסה</span><span className="n">{kg(s.burned_kg)} × ${s.avg_usd_per_kg.toFixed(3)} = {usd(s.cost_usd)}</span></div>
        </div>
      )}
      {result.ok && result.warning && <div className="fuel-note warn">{result.warning}</div>}
      {!result.ok && result.errors.length === 1 && /יותר|בלי כמות/.test(result.errors[0]) && <div className="fuel-note bad">{result.errors[0]}</div>}
    </>
  );
}
