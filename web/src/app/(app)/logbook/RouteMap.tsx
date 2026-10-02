'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
const MAX_ZOOM = 16;

// Zoom and pan (the user, 02.10.2026): a transform on the drawn map, in viewBox units.
// Lines keep their width and labels their size; only the geography grows.
type View = { k: number; x: number; y: number };
const HOME: View = { k: 1, x: 0, y: 0 };
const clampView = (v: View): View => {
  const k = Math.min(MAX_ZOOM, Math.max(1, v.k));
  return { k, x: Math.min(0, Math.max(W - W * k, v.x)), y: Math.min(0, Math.max(H - H * k, v.y)) };
};
// zoom by `factor`, keeping the point (cx, cy) where it is
const zoomAt = (v: View, factor: number, cx: number, cy: number): View => {
  const k = Math.min(MAX_ZOOM, Math.max(1, v.k * factor)), r = k / v.k;
  return clampView({ k, x: cx - (cx - v.x) * r, y: cy - (cy - v.y) * r });
};

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

  // The geography is projected once; dragging and zooming only change the transform.
  const shapes = useMemo(() => ({
    grat: path(geoGraticule10()) ?? undefined,
    land: land ? path(land) ?? undefined : undefined,
    routes: routes.map((r) => {
      const A = airports[r.a], B = airports[r.b];
      return { r, d: path({ type: 'LineString', coordinates: [[A.lon, A.lat], [B.lon, B.lat]] }) ?? undefined };
    }),
  }), [path, land, routes, airports]);

  const [view, setView] = useState<View>(HOME);
  const svg = useRef<SVGSVGElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  // screen pixels to viewBox units (the SVG is letterboxed inside its frame)
  const toBox = useCallback((clientX: number, clientY: number) => {
    const m = svg.current?.getScreenCTM();
    if (!m) return { x: W / 2, y: H / 2 };
    const p = new DOMPoint(clientX, clientY).matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  }, []);

  // The wheel zooms around the cursor. Registered by hand: the wheel listener React adds is passive and cannot stop the page from scrolling.
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = toBox(e.clientX, e.clientY);
      setView((v) => zoomAt(v, e.deltaY < 0 ? 1.25 : 0.8, p.x, p.y));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [toBox]);

  function onPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    if (view.k === 1 && e.pointerType !== 'mouse') return;        // not zoomed: a finger scrolls the page as usual
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, toBox(e.clientX, e.clientY));
  }
  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const now = toBox(e.clientX, e.clientY);
    const others = [...pointers.current.entries()].filter(([id]) => id !== e.pointerId).map(([, p]) => p);
    pointers.current.set(e.pointerId, now);
    if (!others.length) setView((v) => clampView({ ...v, x: v.x + now.x - prev.x, y: v.y + now.y - prev.y }));
    else {
      // two fingers: the change in their distance zooms, around the point between them
      const o = others[0], before = Math.hypot(prev.x - o.x, prev.y - o.y), after = Math.hypot(now.x - o.x, now.y - o.y);
      if (before > 0) setView((v) => zoomAt(v, after / before, (now.x + o.x) / 2, (now.y + o.y) / 2));
    }
  }
  const onPointerEnd = (e: React.PointerEvent<SVGSVGElement>) => { pointers.current.delete(e.pointerId); };
  const zoomBy = (f: number) => setView((v) => zoomAt(v, f, W / 2, H / 2));
  // where a projected point lands on screen after the transform
  const at = (xy: [number, number]): [number, number] => [view.k * xy[0] + view.x, view.k * xy[1] + view.y];

  return (
    <div className="mapwrap">
      <div className="map">
        <svg ref={svg} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="מפת מסלולים"
          className={view.k > 1 ? 'zoomed' : undefined}
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerEnd} onPointerCancel={onPointerEnd}>
          <g className="geo" transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
            <path className="grat" d={shapes.grat} />
            {shapes.land && <path className="land" d={shapes.land} />}
            {shapes.routes.map(({ r, d }) => (
              <path key={`${r.a}-${r.b}`} className={`rt${r.profit < 0 ? ' loss' : ''}`} strokeWidth={1.5 + (r.n / maxN) * 4} d={d}><title>{`${r.a} ↔ ${r.b} · ${r.n} טיסות · ${usd(r.profit)}`}</title></path>
            ))}
          </g>
          {used.map((c) => {
            const p0 = proj([airports[c].lon, airports[c].lat]);
            if (!p0) return null;
            const xy = at(p0);
            return (
              <g key={c}>
                <circle className={`ap${c === home ? ' base' : ''}`} cx={xy[0]} cy={xy[1]} r={4.5} />
                <text x={xy[0]} y={xy[1] - 9} textAnchor="middle">{c}</text>
              </g>
            );
          })}
        </svg>
        <div className="map-zoom" role="group" aria-label="זום">
          <button type="button" onClick={() => zoomBy(1.6)} disabled={view.k >= MAX_ZOOM} aria-label="הגדל">+</button>
          <button type="button" onClick={() => zoomBy(1 / 1.6)} disabled={view.k <= 1} aria-label="הקטן">−</button>
          <button type="button" onClick={() => setView(HOME)} disabled={view.k === 1} aria-label="חזרה לתצוגה המלאה" title="תצוגה מלאה">⤢</button>
        </div>
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
