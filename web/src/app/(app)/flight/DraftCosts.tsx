'use client';

import { useState, useTransition } from 'react';
import type { DraftCosts } from '@/lib/flight-view';
import { saveDraftCosts } from '../flight-actions';

const str = (v: number | null | undefined) => (v == null ? '' : String(v));
const num = (s: string) => (s.trim() === '' || Number.isNaN(Number(s.replace(/,/g, ''))) ? null : Number(s.replace(/,/g, '')));
const FIELDS = [['fuel', 'דלק'], ['ground', 'צוות קרקע'], ['catering', 'קייטרינג']] as const;

// GSX costs during the flight (fuel and catering are known at the gate). The
// completion form at GATE starts from what is saved here.
export function DraftCostsPanel({ ofpId, initial }: { ofpId: string; initial: DraftCosts | null }) {
  const [v, setV] = useState({ fuel: str(initial?.fuel), ground: str(initial?.ground), catering: str(initial?.catering), fuelKg: str(initial?.fuelKg) });
  const [saved, setSaved] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const dirty = FIELDS.some(([k]) => num(v[k]) !== (saved?.[k] ?? null)) || num(v.fuelKg) !== (saved?.fuelKg ?? null);

  function save() {
    const c = { fuel: num(v.fuel), ground: num(v.ground), catering: num(v.catering), fuelKg: num(v.fuelKg) };
    start(async () => {
      const r = await saveDraftCosts(ofpId, c);
      if (r.ok) { setSaved(c); setMsg({ ok: true, text: 'נשמר · ימולא בטופס בסוף הטיסה' }); }
      else setMsg({ ok: false, text: r.errors.join(' · ') });
    });
  }

  return (
    <section className="panel">
      <div className="panel-head"><span className="label">עלויות GSX</span><span className="small">אפשר כבר עכשיו</span></div>
      <div className="form" style={{ gap: 10 }}>
        {FIELDS.map(([k, label]) => (
          <div key={k} className="ff">
            <label htmlFor={`d-${k}`}>{k === 'fuel' ? 'דלק שתודלק' : label}</label>
            {/* fuel: the amount as well as the bill (ADR-062) */}
            {k === 'fuel' && (
              <div className="in" style={{ marginBottom: 6 }}><span className="u">ק״ג</span><input id="d-fuelKg" inputMode="decimal" placeholder="0" value={v.fuelKg}
                onChange={(e) => { setV({ ...v, fuelKg: e.target.value }); setMsg(null); }} aria-label="דלק שתודלק בק״ג" /></div>
            )}
            <div className="in"><span className="u">$</span><input id={`d-${k}`} inputMode="decimal" placeholder="0" value={v[k]}
              onChange={(e) => { setV({ ...v, [k]: e.target.value }); setMsg(null); }} /></div>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-sm btn-primary" disabled={pending || !dirty} onClick={save}>{pending ? 'שומר…' : 'שמור'}</button>
          {msg && <span className={msg.ok ? 'ok' : 'err'}>{msg.text}</span>}
          {!msg && dirty && <span className="small">לא נשמר</span>}
        </div>
        <div className="small">ה-FPM מוזן בסוף הטיסה. אפשר לתקן את הסכומים גם בטופס ההשלמה.</div>
      </div>
    </section>
  );
}
