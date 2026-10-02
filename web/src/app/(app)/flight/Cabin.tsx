'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AISLE_Y, BAND, EXIT_ROWS, LAV, MAP_H, MAP_W, SEATS, SEAT_H, SEAT_W, type CrewId, type LavGroup } from '@/lib/cabin/map';
import {
  MIN, anchorsOf, cabinFits, isNight, phaseLabel, plannedAirMin, progress, servedShare, simulate, stateAt, tierOf,
  type AirDoc, type Anchors, type CartKind, type Sim,
} from '@/lib/cabin/sim';
import { announcements } from '@/lib/cabin/pa';
import { moodOf } from '@/lib/cabin/mood';
import { Stars } from '@/components/FlightScore';
import type { OfpSummary } from '@/lib/ofp';

// The cabin in flight (sketch s14, ADR-061): below the flight dashboard from PUSHBACK until the last
// passenger is off. Display only. The clock is the real one and the phases follow the tracked flight;
// the dots are drawn straight into the SVG every frame, the panels re-render twice a second.

const CREW: CrewId[] = ['A', 'B', 'C', 'D'];
const GROUPS: LavGroup[] = ['front', 'rear'];
const CART_FILL: Record<CartKind, string> = { drink: '#93c5fd', meal: '#fdba74', collect: '#cbd5e1', sales: '#d8b4fe' };
const hhmm = (t: number) => new Date(t).toISOString().slice(11, 16);
const ORDER: (keyof Anchors)[] = ['out', 'off', 'beltOff', 'toc', 'tod', 'beltOn', 'on', 'in'];

type Els = {
  dots: (SVGCircleElement | null)[]; crew: Partial<Record<CrewId, SVGRectElement | null>>;
  carts: (SVGGElement | null)[]; lavs: Record<LavGroup, (SVGCircleElement | null)[]>;
};

// One frame: every dot glides toward where the simulation says it is.
function draw(sim: Sim, t: number, els: Els, xy: Float32Array, crewXy: Partial<Record<CrewId, [number, number]>>, snap: boolean) {
  const s = stateAt(sim, t);
  s.pax.forEach((w, i) => {
    const el = els.dots[i]; if (!el) return;
    if (!w) { el.setAttribute('visibility', 'hidden'); xy[i * 2] = NaN; return; }
    let x = xy[i * 2], y = xy[i * 2 + 1];
    if (snap || Number.isNaN(x) || Math.hypot(w.x - x, w.y - y) > 120) { x = w.x; y = w.y; } else { x += (w.x - x) * 0.3; y += (w.y - y) * 0.3; }
    xy[i * 2] = x; xy[i * 2 + 1] = y;
    el.setAttribute('visibility', 'visible');
    el.setAttribute('cx', x.toFixed(1)); el.setAttribute('cy', y.toFixed(1));
    el.setAttribute('class', `cb-p cb-${w.cls}`);
  });
  for (const id of CREW) {
    const el = els.crew[id]; if (!el) continue;
    const to = s.crew[id], from = crewXy[id];
    const p: [number, number] = snap || !from ? [to[0], to[1]] : [from[0] + (to[0] - from[0]) * 0.12, from[1] + (to[1] - from[1]) * 0.12];
    crewXy[id] = p;
    el.setAttribute('transform', `translate(${p[0].toFixed(1)} ${p[1].toFixed(1)}) rotate(45) translate(-6 -6)`);
  }
  els.carts.forEach((g, k) => {
    if (!g) return;
    const c = s.carts[k];
    if (!c) { g.setAttribute('visibility', 'hidden'); return; }
    g.setAttribute('visibility', 'visible');
    g.setAttribute('transform', `translate(${c.x} ${AISLE_Y})`);
    g.firstElementChild?.setAttribute('fill', CART_FILL[c.kind]);
  });
  for (const g of GROUPS) els.lavs[g].forEach((el, k) => el?.setAttribute('class', `cb-lav${s.busy[g][k] ? ' on' : ''}`));
}

export type CabinProps = {
  ofp: OfpSummary;
  outAt: string | null; offAt: string | null; onAt: string | null; inAt: string | null;
  air: AirDoc | null;
  destName: string | null;
};

export function Cabin({ ofp, outAt, offAt, onAt, inAt, air, destName }: CabinProps) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    // On a timer, not on animation frames: those stop in a background tab, the clock should not.
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0), id = setInterval(tick, 500);
    return () => { clearTimeout(first); clearInterval(id); };
  }, []);

  const pax = ofp.weights.pax ?? 0;
  const { out: sOut, off: sOff, on: sOn, in: sIn } = ofp.sched;
  // Estimates move at most once a minute, so the simulation is rebuilt at most once a minute.
  const minute = now == null ? null : Math.floor(now / MIN);
  const key = useMemo(() => {
    if (minute == null) return null;
    const a = anchorsOf({ out: sOut, off: sOff, on: sOn, in: sIn }, { out: outAt, off: offAt, on: onAt, in: inAt }, air, minute * MIN);
    return ORDER.map((k) => a[k]).join(',');
  }, [minute, sOut, sOff, sOn, sIn, outAt, offAt, onAt, inAt, air]);
  const sim = useMemo(() => {
    if (!key) return null;
    const v = key.split(',').map(Number);
    const a = Object.fromEntries(ORDER.map((k, i) => [k, v[i]])) as Anchors;
    return simulate({ seed: ofp.id, pax, tier: tierOf(plannedAirMin({ out: sOut, off: sOff, on: sOn, in: sIn })), night: isNight(a.out, ofp.orig_utc_offset), a });
  }, [key, ofp.id, ofp.orig_utc_offset, pax, sOut, sOff, sOn, sIn]);

  const els = useRef<Els>({ dots: [], crew: {}, carts: [], lavs: { front: [], rear: [] } });
  const xy = useRef<Float32Array>(new Float32Array(0)), crewXy = useRef<Partial<Record<CrewId, [number, number]>>>({});
  const snap = useRef(true);
  useEffect(() => {
    if (!sim) return;
    if (xy.current.length !== sim.pax.length * 2) { xy.current = new Float32Array(sim.pax.length * 2).fill(NaN); snap.current = true; }
    let raf = 0;
    const frame = () => {
      draw(sim, Date.now(), els.current, xy.current, crewXy.current, snap.current); snap.current = false;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [sim]);

  if (!cabinFits(ofp.aircraft.type, ofp.weights.pax)) return null;       // only the aircraft in the picture
  if (now == null || !sim) return <section className="panel cb"><div className="pb small">מכין את תא הנוסעים…</div></section>;
  if (now >= sim.end) return null;                                       // everybody is off

  const a = sim.a, s = stateAt(sim, now), pr = progress(sim, now);
  const list = announcements(sim, { callsign: ofp.callsign, dest: destName ?? ofp.dest.icao, destUtcOffset: ofp.dest_utc_offset ?? null, cruiseFt: air?.top_alt_ft ?? null });
  let cur = -1;
  list.forEach((x, k) => { if (x.at <= now) cur = k; });
  const used = GROUPS.reduce((n, g) => n + s.busy[g].filter(Boolean).length, 0), waiting = s.queue.front + s.queue.rear;
  const low = !Number.isFinite(a.beltOff);

  // Mood so far: only what has already been measured.
  const tOut = outAt ? Date.parse(outAt) : null, tOff = offAt ? Date.parse(offAt) : null, tOn = onAt ? Date.parse(onAt) : null, tIn = inAt ? Date.parse(inAt) : null;
  const ground = tOut == null ? null : Math.round(((tOff ?? now) - tOut + (tOn == null ? 0 : (tIn ?? now) - tOn)) / MIN);
  const mood = moodOf({
    groundMin: ground, servedShare: air?.tod_at ? servedShare(sim) : null,
    climbFpm: air?.max_climb_fpm ?? null, descentFpm: air?.tod_at ? air.max_descent_fpm : null,       // before the descent there is nothing to judge
  });
  const bars: [string, number | null, string][] = [['שתייה', pr.drink, '#60a5fa'], ['ארוחות', pr.meal, '#fb923c'], ['מכירות', pr.sales, '#c084fc']];

  return (
    <section className="panel cb">
      <div className="panel-head">
        <span className="label">תא הנוסעים</span>
        <span className="chip plan">{phaseLabel(sim, now)}</span>
        <span className="small" style={{ marginInlineStart: 'auto' }}>{sim.pax.length} נוסעים · 4 דיילים</span>
      </div>

      <div className="cb-status">
        <div>
          <div className="label">שלט החגורות</div>
          <div className="v"><span className={`cb-belt${s.belt ? ' on' : ''}`} aria-hidden>🔒</span>{s.belt ? 'דולק' : 'כבוי'}</div>
          <div className="small">{now >= a.in ? 'המטוס בגייט' : low ? 'הטיסה לא עלתה מעל 10,000 רגל' : 'כבה מעל 10,000 רגל'}</div>
        </div>
        <div>
          <div className="label">שירות</div>
          {sim.drink ? (
            <div className="cb-bars">
              {bars.filter(([, p]) => p != null).map(([name, p, c]) => (
                <div key={name} className="ln"><span>{name}</span><div className="tr"><div style={{ width: `${Math.round(p! * 100)}%`, background: c }} /></div><span>{Math.round(p! * 100)}%</span></div>
              ))}
            </div>
          ) : <div className="small">{low ? 'אין שירות מתחת ל-10,000 רגל' : 'טיסה קצרה: אין שירות'}</div>}
        </div>
        <div>
          <div className="label">שירותים</div>
          <div className="v">{s.belt ? 'סגורים' : `${used} מתוך 3 תפוסים`}</div>
          <div className="small">{s.belt ? 'פתוחים רק כשהשלט כבוי' : waiting ? `${waiting} ממתינים בתור` : 'אין תור'}</div>
        </div>
        <div>
          <div className="label">מצב רוח הנוסעים · עד עכשיו</div>
          {mood ? <div className="v">{mood.total.toFixed(1)}<Stars v={mood.total} /></div> : <div className="v">—</div>}
          <div className="small">
            {[ground != null && `${ground} דק׳ על הקרקע`, air?.max_climb_fpm != null && `טיפוס ${air.max_climb_fpm.toLocaleString('en-US')}`, air?.tod_at && air.max_descent_fpm != null && `הנמכה ${air.max_descent_fpm.toLocaleString('en-US')}`]
              .filter(Boolean).join(' · ') || 'יחושב במהלך הטיסה'}
          </div>
        </div>
      </div>

      <div className="cb-scroll">
        <div className="cb-map">
          <svg viewBox={`0 ${BAND.y} ${MAP_W} ${BAND.h}`} role="img" aria-label="מבט-על של תא הנוסעים">
            <image href="/cabin-737.jpg" x="0" y="0" width={MAP_W} height={MAP_H} />
            {SEATS.map((st) => (
              <g key={st.id}>
                <rect x={st.x} y={st.y} width={SEAT_W} height={SEAT_H} rx="4.5" className={`cb-seat${EXIT_ROWS.includes(st.row) ? ' exit' : ''}`} />
                <rect x={st.x + SEAT_W - 6.5} y={st.y + 2.5} width="4.5" height={SEAT_H - 5} rx="2.2" className="cb-head" />
              </g>
            ))}
            {GROUPS.flatMap((g) => LAV[g].at.map(([x, y], k) => (
              <circle key={`${g}${k}`} cx={x} cy={y} r="17" className="cb-lav" ref={(el) => { els.current.lavs[g][k] = el; }} />
            )))}
            {[0, 1].map((k) => (
              <g key={k} className="cb-cart" visibility="hidden" ref={(el) => { els.current.carts[k] = el; }}><rect x="-9" y="-6" width="18" height="12" rx="3" /></g>
            ))}
            {sim.pax.map((p) => <circle key={p.i} r="6.6" className="cb-p cb-sit" visibility="hidden" ref={(el) => { els.current.dots[p.i] = el; }} />)}
            {CREW.map((id) => <rect key={id} width="12" height="12" rx="2" className="cb-crew" ref={(el) => { els.current.crew[id] = el; }} />)}
          </svg>
          {cur >= 0 && (
            <div className="cb-pa">
              <div className="he"><b>כריזה · <bdi>{hhmm(list[cur].at)}Z</bdi></b>{list[cur].he}</div>
              <div className="en">{list[cur].en}</div>
            </div>
          )}
        </div>
      </div>

      <div className="cb-legend">
        <span><i className="cb-sit" />יושב</span><span><i className="cb-drink" />שותה</span><span><i className="cb-eat" />אוכל</span>
        <span><i className="cb-sleep" />ישן</span><span><i className="cb-walk" />הולך במעבר</span><span><i className="cb-queue" />בתור לשירותים</span>
        <span><i className="cb-call" />קרא לדייל</span><span><i className="cb-buy" />קונה</span><span><i className="cb-out" />יורד מהמטוס</span>
        <span><i className="sq" />דייל</span><span><i className="ct" />עגלה</span>
      </div>

      <div className="cb-log-wrap">
        <div className="label">הכריזות בטיסה</div>
        <div className="cb-log" style={{ gridTemplateRows: `repeat(${Math.ceil(list.length / 2)}, auto)` }}>
          {list.map((x, k) => (
            <div key={x.key} className={k === cur ? 'cur' : k > cur ? 'next' : undefined}>
              <span className="t">{k <= cur ? hhmm(x.at) : ''}</span><span>{x.he.split('.')[0]}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
