import type { FleetAircraft, FleetEvent } from '@/lib/fleet';
import { CHECK_LABEL, GROUND_DAYS, TIER_LABEL, untilDue, type NextCheck } from '@/lib/maintenance';
import { ddmm, nf, usd } from '@/lib/format';
import { PayRepairButton } from '@/components/PayRepair';

// Fleet (sketch s12, ADR-060): one card per registration flown in the new system.

function Due({ c }: { c: NextCheck }) {
  const soon = c.leftHours <= 5;
  return (
    <div className="fl-due">
      <div className="ln">
        <span>{CHECK_LABEL[c.kind]} · כל {nf(c.everyHours)} שעות · <bdi>{usd(c.cents, false)}</bdi></span>
        <b>בעוד {c.leftHours.toFixed(1)} שעות{soon && <> <span className="chip warn">קרוב</span></>}</b>
      </div>
      <div className="fl-meter"><div className={soon ? 'soon' : undefined} style={{ width: `${c.doneShare * 100}%` }} /></div>
    </div>
  );
}

const STATE: Record<FleetEvent['state'], [string, string]> = {
  closing: ['go', 'שולם בסגירת הטיסה'], open: ['bad', 'ממתין לתשלום'], manual: ['go', 'שולם'], auto: ['warn', `נרשם אוטומטית אחרי ${GROUND_DAYS} ימים`],
};

export function FleetView({ fleet, now }: { fleet: FleetAircraft[]; now: number }) {
  if (!fleet.length) {
    return <section className="panel"><div className="pb muted">עוד אין מטוסים. המטוס הראשון יופיע כאן אחרי שתיסגר טיסה עם רישום ב-OFP.</div></section>;
  }
  return (
    <div className="stack">
      <section className="panel">
        <div className="panel-head"><span className="label">המטוסים שלך</span><span className="small" style={{ marginInlineStart: 'auto' }}>שעות אוויר מאז המעבר למערכת החדשה · הטיסות ההיסטוריות לא נספרות</span></div>
        <div className="fl-grid">
          {fleet.map((a) => (
            <div key={a.reg} className="fl-ac">
              <div className="hd">
                <span className="reg"><bdi>{a.reg}</bdi></span>
                <span className="small"><bdi>{[a.type, a.mtowT ? `MTOW ${a.mtowT.toFixed(1)} t` : null].filter(Boolean).join(' · ')}</bdi></span>
                {a.open ? <span className="chip bad">מושבת</span> : <span className="chip go">כשיר לטיסה</span>}
              </div>
              <div className="fl-facts">
                <div><div className="label">שעות אוויר</div><div className="v">{a.airHours.toFixed(1)}</div></div>
                <div><div className="label">טיסות</div><div className="v">{a.flights}</div></div>
                <div><div className="label">נחיתות קשות</div><div className="v">{a.hardLandings}</div></div>
                <div><div className="label">טיפולים ותיקונים</div><div className="v"><bdi>{usd(a.spentCents, false)}</bdi></div></div>
              </div>
              {a.open && (
                <div className="fl-req">
                  <div className="t">תיקון אחרי נחיתה קשה · המטוס מושבת</div>
                  <div className="small">
                    נחיתה של <bdi className="ltr">{a.open.fpm} FPM</bdi> בטיסה <bdi>{a.open.callsign ?? ''}</bdi> (<bdi>{a.open.origin}</bdi> ← <bdi>{a.open.dest}</bdi>): {TIER_LABEL[a.open.tier] ?? a.open.tier}.
                  </div>
                  <div className="row">
                    <PayRepairButton id={a.open.id} cents={a.open.cents} long />
                    <span className="small">בלי תשלום: משתחרר לבד בעוד <b>{untilDue(a.open.dueAt, now)}</b>, והסכום נרשם אז אוטומטית.</span>
                    <span className="amt neg"><bdi>{usd(-a.open.cents)}</bdi></span>
                  </div>
                </div>
              )}
              {a.checks.length ? a.checks.map((c) => <Due key={c.kind} c={c} />) : <div className="small">בגרסת התעריפים הנוכחית אין טיפולים תקופתיים.</div>}
            </div>
          ))}
        </div>
      </section>

      {fleet.filter((a) => a.history.length).map((a) => (
        <section key={a.reg} className="panel">
          <div className="panel-head"><span className="label">היסטוריית תחזוקה · <bdi>{a.reg}</bdi></span></div>
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead><tr><th>תאריך</th><th>מה</th><th>הטיסה</th><th>מצב</th><th className="n">סכום</th></tr></thead>
              <tbody>
                {a.history.map((e, k) => (
                  <tr key={k}>
                    <td>{ddmm(e.at)}</td>
                    <td>{e.what === 'check' ? `${CHECK_LABEL[e.kind as 'light' | 'medium'] ?? 'טיפול'}` : <>תיקון אחרי נחיתה קשה · <bdi className="ltr">{e.fpm} FPM</bdi></>}</td>
                    <td><bdi>{[e.callsign, `${e.origin} → ${e.dest}`].filter(Boolean).join(' · ')}</bdi></td>
                    <td><span className={`chip ${STATE[e.state][0]}`}>{STATE[e.state][1]}</span></td>
                    <td className="n neg"><bdi>{usd(-e.cents)}</bdi></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
