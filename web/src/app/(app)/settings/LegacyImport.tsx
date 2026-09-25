'use client';

import { useState, useTransition } from 'react';
import { importLegacyAction, type LegacyResult } from './actions';

type Plan = { total: number; missing: number; present: number; errors: string[]; mongoCents: number; from: string | null; to: string | null } | { error: string };

const usd = (c: number) => `$${Math.round(c / 100).toLocaleString('en-US')}`;
const day = (iso: string | null) => (iso ? iso.slice(0, 10).split('-').reverse().join('.') : '—');

// WP8 (ADR-030): bring the old app's flights over as "historical".
export function LegacyImport({ plan }: { plan: Plan }) {
  const [result, setResult] = useState<LegacyResult | null>(null);
  const [pending, start] = useTransition();

  return (
    <section className="panel">
      <div className="panel-head"><span className="label">ייבוא מהמערכת הישנה</span><span className="small">ADR-030 · טיסות היסטוריות, שורת רווח אחת לכל טיסה</span></div>
      <div className="panel-body" style={{ display: 'grid', gap: 10 }}>
        {'error' in plan ? (
          <div className="err">לא ניתן להתחבר ל-MongoDB: {plan.error}</div>
        ) : (
          <>
            <div className="kv" style={{ maxWidth: 420 }}>
              <span>טיסות במערכת הישנה</span><span className="v">{plan.total}</span>
              <span>טווח תאריכים</span><span className="v"><bdi className="ltr">{day(plan.from)} – {day(plan.to)}</bdi></span>
              <span>סך הרווח שנשמר שם</span><span className="v"><bdi className="ltr">{usd(plan.mongoCents)}</bdi></span>
              <span>כבר הועברו</span><span className="v">{plan.present}</span>
              <span>ממתינות להעברה</span><span className="v">{plan.missing}</span>
            </div>
            {plan.errors.length > 0 && <div className="err">לא יועברו ({plan.errors.length}): {plan.errors.join(' · ')}</div>}
            <div className="small">הזמנים לא עוברים (אין במערכת הישנה OUT/OFF/ON/IN). זמן האוויר המתוכנן נשמר ומשמש לשעות ולדרגה. הטיסה האחרונה קובעת את מיקום הצוות.</div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button type="button" className="btn btn-sm btn-primary" disabled={pending || plan.missing === 0}
                onClick={() => start(async () => setResult(await importLegacyAction()))}>
                {pending ? 'מעביר…' : plan.missing ? `העבר ${plan.missing} טיסות` : 'הכל כבר הועבר'}
              </button>
            </div>
          </>
        )}
        {result && (result.ok ? (
          <div className={result.neonCents === result.mongoCents ? 'ok' : 'err'}>
            הועברו {result.imported} · דולגו {result.skipped} · סך ב-Neon <bdi className="ltr">{usd(result.neonCents)}</bdi> מול <bdi className="ltr">{usd(result.mongoCents)}</bdi> במערכת הישנה
            {result.neonCents === result.mongoCents ? ' ✓ תואם' : ' ✗ לא תואם — לבדוק'}
          </div>
        ) : <div className="err">{result.error}</div>)}
      </div>
    </section>
  );
}
