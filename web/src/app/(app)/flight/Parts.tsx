// Server-renderable pieces of the flight screen shared by several states.
import Link from 'next/link';
import type { Base, RecentFlight } from '@/lib/flight-view';
import type { OfpSummary } from '@/lib/ofp';
import { ddmm, hm, nf, usd } from '@/lib/format';

export function Route({ ofp, actual, diverted }: { ofp: OfpSummary; actual?: { icao: string; name: string | null } | null; diverted?: boolean }) {
  return (
    <span className="route">
      <bdi>{ofp.origin.icao}</bdi>
      <span className="arr">←</span>
      {diverted && actual ? (
        <><bdi>{actual.icao}</bdi>{actual.name && <small>{actual.name}</small>}<s><bdi>{ofp.dest.icao}</bdi></s><span className="chip warn">הסטה</span></>
      ) : <bdi>{ofp.dest.icao}</bdi>}
    </span>
  );
}

export function Head({ ofp, tag, children, actual, diverted }: {
  ofp: OfpSummary; tag: React.ReactNode; children?: React.ReactNode; actual?: { icao: string; name: string | null } | null; diverted?: boolean;
}) {
  return (
    <div className="live-head">
      {tag}
      {ofp.callsign && <span className="callsign"><bdi>{ofp.callsign}</bdi></span>}
      <Route ofp={ofp} actual={actual} diverted={diverted} />
      <span className="acft"><bdi>{[ofp.aircraft.type, ofp.aircraft.reg].filter(Boolean).join(' · ')}</bdi></span>
      {children && <span className="src">{children}</span>}
    </div>
  );
}

export function RecentTable({ rows }: { rows: RecentFlight[] }) {
  if (!rows.length) return <div className="pb small">עוד אין טיסות בלוגבוק. הטיסה הראשונה שתיסגר תופיע כאן.</div>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="tbl">
        <thead><tr><th>תאריך</th><th>מסלול</th><th>מטוס</th><th className="n">בלוק</th><th className="n">FPM</th><th className="n">רווח / הפסד</th></tr></thead>
        <tbody>
          {rows.map((f) => (
            <tr key={f.id}>
              <td>{ddmm(f.date)}</td>
              <td>
                <bdi>{f.origin}</bdi> ← <bdi>{f.dest}</bdi>
                {f.source === 'manual' && <span className="chip" style={{ marginInlineStart: 6 }}>ידנית</span>}
                {f.source === 'partial' && <span className="chip warn" style={{ marginInlineStart: 6 }}>חלקית</span>}
                {f.source === 'historical' && <span className="chip" style={{ marginInlineStart: 6 }}>היסטורית</span>}
                {f.diverted && <span className="chip warn" style={{ marginInlineStart: 6 }}>הסטה</span>}
              </td>
              <td>{f.aircraft ?? '—'}</td>
              <td className="n">{hm(f.blockMin)}</td>
              <td className={`n${f.fpm != null && Math.abs(f.fpm) > 400 ? ' neg' : ''}`}>{f.fpm ?? '—'}</td>
              <td className={`n ${f.profitCents >= 0 ? 'pos' : 'neg'}`}>{usd(f.profitCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MonthAside({ base }: { base: Base }) {
  const m = base.month;
  return (
    <section className="panel">
      <div className="panel-head"><span className="label">{m.label}</span></div>
      <div className="pb">
        <div className="small">רווח נקי</div>
        <div className={`big ${m.profitCents >= 0 ? 'pos' : 'neg'}`}><bdi className="ltr">{usd(m.profitCents)}</bdi></div>
        <div className="kv" style={{ marginTop: 12 }}>
          <span>טיסות</span><span className="v">{m.flights}</span>
          <span>שעות בלוק</span><span className="v">{hm(m.blockMin)}</span>
          <span>ממוצע לטיסה</span><span className="v"><bdi className="ltr">{m.flights ? usd(Math.round(m.profitCents / m.flights)) : '—'}</bdi></span>
        </div>
      </div>
    </section>
  );
}

export function LogbookLink() {
  return <Link className="link" href="/logbook">כל הלוגבוק ←</Link>;
}

export function MilestoneAside({ base }: { base: Base }) {
  const m = base.nextMilestone;
  if (!m) return null;
  const fmt = (v: number) => (m.unit === 'h' ? hm(Math.round(v * 60)) : m.unit === '$' ? `$${nf(Math.floor(v))}` : nf(Math.floor(v)));
  const left = m.next - m.current;
  return (
    <section className="panel">
      <div className="panel-head"><span className="label">אבן הדרך הבאה</span><Link className="link" href="/analysis?p=all">כל אבני הדרך ←</Link></div>
      <div className="pb">
        <div style={{ fontWeight: 600 }}><bdi className="ltr">{m.unit === '$' ? `$${nf(m.next)}` : `${nf(m.next)}${m.unit === 'NM' ? ' NM' : ''}`}</bdi> {m.name}</div>
        <div className="ms-bar" style={{ margin: '10px 0 6px' }}><div style={{ width: `${Math.min(100, (m.current / m.next) * 100)}%` }} /></div>
        <div className="kv"><span className="small"><bdi className="ltr">{fmt(m.current)}</bdi> מתוך <bdi className="ltr">{fmt(m.next)}</bdi></span><span className="v small">עוד <bdi className="ltr">{fmt(left)}</bdi></span></div>
      </div>
    </section>
  );
}
