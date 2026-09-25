'use client';

import { useEffect, useMemo, useState } from 'react';
import { geoEquirectangular, geoGraticule10, geoPath, type GeoPermissibleObjects } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology } from 'topojson-specification';
import type { LogFlight } from '@/lib/logbook-filter';
import type { ApPoint } from '@/lib/logbook';
import { usd } from '@/lib/format';

// Route map (ADR-022): origin → destination arcs for the flights that pass the
// filters. No flown track is stored, so each line is a great circle. A map is
// a map: west stays on the left even in the RTL interface.
const W = 800, H = 520;

type Route = { a: string; b: string; n: number; profit: number };

export function RouteMap({ list, airports, home }: { list: LogFlight[]; airports: Record<string, ApPoint>; home: string }) {
  const [land, setLand] = useState<GeoPermissibleObjects | null>(null);
  useEffect(() => {
    import('world-atlas/land-50m.json').then((m) => {
      const topo = m.default as unknown as Topology;
      setLand(feature(topo, topo.objects.land) as unknown as GeoPermissibleObjects);
    });
  }, []);

  const routes = useMemo(() => {
    const r: Record<string, Route> = {};
    for (const f of list) {
      if (!airports[f.origin] || !airports[f.dest]) continue;
      const k = [f.origin, f.dest].sort().join('-');
      r[k] ??= { a: f.origin, b: f.dest, n: 0, profit: 0 };
      r[k].n++; r[k].profit += f.profitCents;
    }
    return Object.values(r).sort((x, y) => y.n - x.n);
  }, [list, airports]);

  const used = useMemo(() => [...new Set(routes.flatMap((r) => [r.a, r.b]))], [routes]);

  // Fit the projection to the airports in view (with a margin), or to Europe/Middle East when empty.
  const { path, proj } = useMemo(() => {
    const pts = used.length ? used.map((c) => [airports[c].lon, airports[c].lat]) : [[-10, 28], [45, 55]];
    const bbox: GeoPermissibleObjects = { type: 'MultiPoint', coordinates: pts };
    const p = geoEquirectangular().fitExtent([[60, 50], [W - 60, H - 50]], bbox);
    if (used.length === 1) p.scale(1200).center([airports[used[0]].lon, airports[used[0]].lat]).translate([W / 2, H / 2]);
    return { path: geoPath(p), proj: p };
  }, [used, airports]);

  const maxN = Math.max(1, ...routes.map((r) => r.n));

  return (
    <div className="mapwrap">
      <div className="map">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="מפת מסלולים">
          <path className="grat" d={path(geoGraticule10()) ?? undefined} />
          {land && <path className="land" d={path(land) ?? undefined} />}
          {routes.map((r) => {
            const A = airports[r.a], B = airports[r.b];
            const d = path({ type: 'LineString', coordinates: [[A.lon, A.lat], [B.lon, B.lat]] });
            return <path key={`${r.a}-${r.b}`} className={`rt${r.profit < 0 ? ' loss' : ''}`} strokeWidth={1.5 + (r.n / maxN) * 4} d={d ?? undefined}><title>{`${r.a} ↔ ${r.b} · ${r.n} טיסות · ${usd(r.profit)}`}</title></path>;
          })}
          {used.map((c) => {
            const xy = proj([airports[c].lon, airports[c].lat]);
            if (!xy) return null;
            return (
              <g key={c}>
                <circle className={`ap${c === home ? ' base' : ''}`} cx={xy[0]} cy={xy[1]} r={4.5} />
                <text x={xy[0]} y={xy[1] - 9} textAnchor="middle">{c}</text>
              </g>
            );
          })}
        </svg>
        <div className="caption">קו = מוצא ← יעד (לא נשמר מסלול בפועל) · עובי = מספר טיסות · אדום = מסלול בהפסד</div>
      </div>
      <aside className="routes-list">
        <div className="panel-head"><span className="label">מסלולים בסינון</span></div>
        <table className="tbl">
          <thead><tr><th>מסלול</th><th className="n">טיסות</th><th className="n">רווח</th></tr></thead>
          <tbody>
            {routes.length ? routes.map((r) => (
              <tr key={`${r.a}-${r.b}`}><td><bdi>{r.a}</bdi> ↔ <bdi>{r.b}</bdi></td><td className="n">{r.n}</td><td className={`n ${r.profit < 0 ? 'neg' : 'pos'}`}>{usd(r.profit)}</td></tr>
            )) : <tr><td colSpan={3} className="muted">אין מסלולים</td></tr>}
          </tbody>
        </table>
      </aside>
    </div>
  );
}
