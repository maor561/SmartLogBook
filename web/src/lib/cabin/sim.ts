// The cabin in flight (sketch s14, ADR-061): what 120-odd passengers and four flight attendants do
// between PUSHBACK and the gate. Display only, like the terminal (ADR-053): nothing here touches the
// ledger. Deterministic per OFP (the seed is the OFP id). Who goes to the lavatory, who sleeps and who
// buys is decided once; the big phases hang on anchors that come from the real flight (anchorsOf).
import { rng } from '../terminal/sim';
import { AISLE_Y, DOOR, FIRST_ROW, GALLEY, JUMP, LAV, MID_ROW, ROWS, rowX, SEATS, SEAT_H, SEAT_W, type CrewId, type LavGroup } from './map';

export const SEC = 1000, MIN = 60_000;
const SPEED = 30 / SEC;                                       // px per ms in the aisle: about 1 m/s

// ---------- anchors: the moments of the real flight the cabin hangs on (ms since epoch)

export type Anchors = {
  out: number; off: number;
  beltOff: number;                                           // Infinity: the flight never climbs through 10,000 ft
  toc: number; tod: number; beltOn: number; on: number;
  in: number;                                                // Infinity until the aircraft is at the gate
};
export type AirDoc = {
  belt_off_at: string | null; toc_at: string | null; tod_at: string | null; belt_on_at: string | null;
  max_climb_fpm: number | null; max_descent_fpm: number | null; top_alt_ft: number | null;
};
export type T4 = { out: string | null; off: string | null; on: string | null; in: string | null };

const ms = (v: string | null | undefined) => (v ? Date.parse(v) : null);
const span = (a: string | null, b: string | null, fallbackMin: number) => {
  const x = ms(a), y = ms(b);
  return x != null && y != null && y > x ? y - x : fallbackMin * MIN;
};
export const plannedAirMin = (sched: T4) => span(sched.off, sched.on, 90) / MIN;

// What has been measured stays; what has not happened yet is estimated from the plan and is never in
// the past (so the cabin waits in its current phase when the flight runs late).
// `air` is null on a Worker that does not track the air part, and during the first minute after
// takeoff: then the seat-belt sign and the descent follow the plan.
export function anchorsOf(sched: T4, times: T4, air: AirDoc | null | undefined, now: number): Anchors {
  const soon = Math.ceil(now / MIN) * MIN + MIN;
  const taxiOut = span(sched.out, sched.off, 15), airTime = span(sched.off, sched.on, 90);
  const tOff = ms(times.off), tOn = ms(times.on);
  const out = ms(times.out) ?? (tOff ?? now) - taxiOut;
  const off = tOff ?? Math.max(out + taxiOut, soon);

  const beltOffReal = ms(air?.belt_off_at), todReal = ms(air?.tod_at);
  const beltOff = beltOffReal ?? (air ? (todReal != null || tOn != null ? Infinity : Math.max(off + 6 * MIN, soon)) : off + 6 * MIN);
  const onPlan = Math.max(todReal != null ? todReal + 22 * MIN : off + airTime, soon);
  const on = tOn ?? onPlan;
  const tod = todReal ?? (air && tOn == null ? Math.max(off + airTime - 26 * MIN, soon) : Math.max(on - 26 * MIN, Math.min(beltOff, off + 6 * MIN) + MIN));
  const beltOn = ms(air?.belt_on_at) ?? (air && tOn == null ? Math.max(tod + 14 * MIN, soon) : Math.max(on - 9 * MIN, tod + MIN));
  const toc = ms(air?.toc_at) ?? (air ? Math.max(beltOff + 8 * MIN, soon) : beltOff + 12 * MIN);
  return { out, off, beltOff, toc, tod, beltOn, on, in: ms(times.in) ?? Infinity };
}

// ---------- the service plan

export type Tier = 'none' | 'drinks' | 'meal' | 'full';
const HALF = Math.max(MID_ROW - FIRST_ROW + 1, ROWS.length - (MID_ROW - FIRST_ROW + 1));     // rows per cart
const PER = { drink: 35 * SEC, meal: 50 * SEC, collect: 18 * SEC, sales: 8 * SEC, buy: 55 * SEC };
const GAPS = { drink: 4 * MIN, meal: 3 * MIN, collect: 12 * MIN, sales: 2 * MIN };
const DRINK_END = GAPS.drink + HALF * PER.drink;
const COLLECT_END = DRINK_END + GAPS.meal + HALF * PER.meal + GAPS.collect + HALF * PER.collect;
// Minutes between the seat-belt sign going off and the descent that each plan needs.
export const TIER_NEEDS = { drinks: DRINK_END / MIN + 1, meal: COLLECT_END / MIN + 2, full: COLLECT_END / MIN + 22 };
// The plan is fixed before the flight from the planned air time (28 minutes of it are climb to
// 10,000 ft and descent): a short flight is not punished for having no meal.
export function tierOf(airMin: number): Tier {
  const window = airMin - 28;
  return window >= TIER_NEEDS.full ? 'full' : window >= TIER_NEEDS.meal ? 'meal' : window >= TIER_NEEDS.drinks ? 'drinks' : 'none';
}

type Service = { start: number; end: number; per: number; at: Record<number, number> };
export type Trip = { grp: LavGroup; k: number; leave: number; ready: number; start: number; end: number; back: number };
export type Pax = {
  i: number; row: number; sx: number; sy: number; buys: boolean; sleeps: boolean;
  sleepFrom: number; sleepTo: number; leaveAt: number; trips: Trip[];
};
type Call = { p: Pax; t: number; team: LavGroup; arrive: number; done: number; home: number };
export type SimInput = { seed: string; pax: number; tier: Tier; night: boolean; a: Anchors };
export type Sim = {
  input: SimInput; a: Anchors; pax: Pax[];
  drink: Service | null; meal: Service | null; collect: Service | null;
  sales: (Service & { stop: Record<number, number> }) | null;
  calls: Call[]; quiet: number; end: number;
};

const FRONT_ROWS = ROWS.filter((r) => r <= MID_ROW), REAR_ROWS = ROWS.filter((r) => r > MID_ROW).reverse();
// Two carts, one from each galley, meeting in the middle.
function twoCarts(start: number, per: number): Service {
  const at: Record<number, number> = {};
  FRONT_ROWS.forEach((r, i) => { at[r] = start + i * per; });
  REAR_ROWS.forEach((r, i) => { at[r] = start + i * per; });
  return { start, per, at, end: start + HALF * per };
}

export type CartKind = 'drink' | 'meal' | 'collect' | 'sales';
export type Cart = { x: number; kind: CartKind; team: LavGroup };

// Where the carts are. Carts are stowed when the descent starts.
export function carts(sim: Sim, t: number): Cart[] {
  if (t >= sim.a.tod) return [];
  const two = (s: Service | null, kind: CartKind): Cart[] | null => {
    if (!s || t < s.start || t >= s.end) return null;
    const i = Math.floor((t - s.start) / s.per), list: Cart[] = [];
    if (i < FRONT_ROWS.length) list.push({ x: rowX(FRONT_ROWS[i]), kind, team: 'front' });
    if (i < REAR_ROWS.length) list.push({ x: rowX(REAR_ROWS[i]), kind, team: 'rear' });
    return list;
  };
  const a = two(sim.drink, 'drink') ?? two(sim.meal, 'meal') ?? two(sim.collect, 'collect');
  if (a) return a;
  const s = sim.sales;
  if (s && t >= s.start && t < s.end) {
    let row = FIRST_ROW;
    for (const r of ROWS) if (s.at[r] <= t) row = r;
    return [{ x: rowX(row), kind: 'sales', team: 'front' }];
  }
  return [];
}

const served = (sim: Sim, s: Service | null, row: number) => Boolean(s) && s!.at[row] < sim.a.tod;

export function simulate(input: SimInput): Sim {
  const { seed, tier, a } = input;
  const n = Math.max(0, Math.min(SEATS.length, Math.round(input.pax)));

  // a seat for everyone
  const pick = rng(seed, 1), pool = SEATS.slice();
  for (let k = pool.length - 1; k > 0; k--) { const j = Math.floor(pick() * (k + 1)); [pool[k], pool[j]] = [pool[j], pool[k]]; }
  const pax: Pax[] = pool.slice(0, n).map((s, i) => {
    const r = rng(seed, 100 + i);
    return {
      i, row: s.row, sx: s.x + SEAT_W / 2, sy: s.y + SEAT_H / 2,
      buys: r() < 0.1, sleeps: r() < (input.night ? 0.6 : 0.25),
      sleepFrom: 0, sleepTo: 0, leaveAt: Infinity, trips: [],
    };
  });

  // the services, one after the other from the moment the seat-belt sign goes off
  const has = Number.isFinite(a.beltOff) && tier !== 'none';
  const drink = has ? twoCarts(a.beltOff + GAPS.drink, PER.drink) : null;
  const withMeal = has && tier !== 'drinks';
  const meal = withMeal ? twoCarts(drink!.end + GAPS.meal, PER.meal) : null;
  const collect = withMeal ? twoCarts(meal!.end + GAPS.collect, PER.collect) : null;
  let sales: Sim['sales'] = null;
  if (has && tier === 'full') {
    // one cart from the front; it stops only next to a buyer
    const start = collect!.end + GAPS.sales, at: Record<number, number> = {}, stop: Record<number, number> = {};
    let t = start;
    for (const r of ROWS) { at[r] = t; stop[r] = pax.filter((p) => p.buys && p.row === r).length * PER.buy; t += PER.sales + stop[r]; }
    sales = { start, per: PER.sales, at, stop, end: t };
  }
  const quiet = (sales ?? collect ?? drink)?.end ?? a.beltOff + 3 * MIN;
  const sim: Sim = { input, a, pax, drink, meal, collect, sales, calls: [], quiet: quiet + 2 * MIN, end: a.in + 10 * MIN };

  for (const p of pax) {
    const r = rng(seed, 500 + p.i);
    const base = collect && served(sim, collect, p.row) ? collect.at[p.row] : drink ? drink.at[p.row] + 7 * MIN : a.beltOff + 5 * MIN;
    p.sleepFrom = base + (2 + r() * 12) * MIN;
    p.sleepTo = a.tod + r() * 6 * MIN;                         // the descent announcement wakes them
    p.leaveAt = a.in + 25 * SEC + (p.row - FIRST_ROW) * 13 * SEC + r() * 9 * SEC;
  }

  // Lavatory trips. Every passenger has the same wishes whatever the length of the flight (a first
  // trip some time in the first five hours, then every two to four hours); only those that fit before
  // the sign comes back on happen. First come, first served, like the terminal queues.
  if (Number.isFinite(a.beltOff)) {
    const wanted: { p: Pax; t: number; dur: number }[] = [];
    for (const p of pax) {
      const r = rng(seed, 1000 + p.i);
      let t = a.beltOff + 2 * MIN + r() * 300 * MIN;
      for (let k = 0; k < 4; k++) { wanted.push({ p, t, dur: (150 + r() * 90) * SEC }); t += (120 + r() * 120) * MIN; }
    }
    wanted.sort((x, y) => x.t - y.t || x.p.i - y.p.i);
    const last = a.beltOn - 12 * MIN;
    const blocked = (x1: number, x2: number, t: number) => carts(sim, t).some((c) => c.x > Math.min(x1, x2) - 6 && c.x < Math.max(x1, x2) + 6);
    // first, when each one gets up and reaches the door …
    const going: { p: Pax; grp: LavGroup; leave: number; walk: number; dur: number }[] = [];
    for (const w of wanted) {
      const p = w.p;
      let t = w.t, grp: LavGroup | null = null;
      if (t > last) break;
      const pref: LavGroup[] = p.row <= 31 ? ['front', 'rear'] : ['rear', 'front'];
      for (let k = 0; k < 6; k++) {                                              // a cart in the aisle blocks the way: wait in the seat
        grp = pref.find((g) => !blocked(p.sx, LAV[g].door, t)) ?? null;
        if (grp) break;
        t += 2 * MIN;
      }
      if (!grp || t > last) continue;
      going.push({ p, grp, leave: t, walk: (Math.abs(p.sx - LAV[grp].door) + Math.abs(p.sy - AISLE_Y)) / SPEED, dur: w.dur });
    }
    // … then the doors, in the order people arrive at them
    const free: Record<LavGroup, number[]> = { front: [0], rear: [0, 0] };
    going.sort((x, y) => x.leave + x.walk - (y.leave + y.walk) || x.p.i - y.p.i);
    for (const g of going) {
      const ready = g.leave + g.walk, f = free[g.grp];
      let k = 0;
      for (let j = 1; j < f.length; j++) if (f[j] < f[k]) k = j;
      const start = Math.max(ready, f[k]), end = start + g.dur;
      f[k] = end;
      g.p.trips.push({ grp: g.grp, k, leave: g.leave, ready, start, end, back: end + g.walk });
    }

    // the quiet part of the cruise: now and then somebody calls a flight attendant
    const r = rng(seed, 7);
    for (let k = 0; k < 12 && pax.length; k++) {
      const t = sim.quiet + (k + r()) * 12 * MIN, p = pax[Math.floor(r() * pax.length)];
      if (t >= a.tod - 8 * MIN) continue;
      const team: LavGroup = p.row <= MID_ROW ? 'front' : 'rear', walk = Math.abs(p.sx - GALLEY[team][0]) / SPEED;
      sim.calls.push({ p, t, team, arrive: t + 25 * SEC + walk, done: t + 65 * SEC + walk, home: t + 65 * SEC + 2 * walk });
    }
  }
  return sim;
}

// ---------- the state at a moment

export type PaxClass = 'sit' | 'drink' | 'eat' | 'sleep' | 'walk' | 'queue' | 'call' | 'buy' | 'out';
export type Dot = { x: number; y: number; cls: PaxClass };
export type State = {
  belt: boolean; carts: Cart[]; pax: (Dot | null)[];
  crew: Record<CrewId, [number, number]>;
  queue: Record<LavGroup, number>; busy: Record<LavGroup, boolean[]>;
};

type XY = [number, number];
const mix = (p: XY, q: XY, f: number): XY => [p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f];
function along(pts: XY[], f: number): XY {
  const seg: number[] = [];
  let len = 0;
  for (let k = 1; k < pts.length; k++) { const d = Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]); seg.push(d); len += d; }
  let d = Math.min(1, Math.max(0, f)) * len;
  for (let k = 0; k < seg.length; k++) {
    if (d <= seg[k] || k === seg.length - 1) return mix(pts[k], pts[k + 1], seg[k] ? Math.min(1, d / seg[k]) : 1);
    d -= seg[k];
  }
  return pts[pts.length - 1];
}

// The sign: on until 10,000 ft, on again for the approach, and off once the aircraft is at the gate.
export const beltOn = (a: Anchors, t: number) => t < a.in && (t < a.beltOff || t >= a.beltOn);
const DEMO: Record<CrewId, number> = { A: 22, B: 30, C: 39, D: 47 };        // where each one stands for the safety demonstration
export const demoAt = (a: Anchors, t: number) => t >= a.out + 2.5 * MIN && t < Math.min(a.out + 6 * MIN, a.off);

export function stateAt(sim: Sim, t: number): State {
  const { a } = sim, cs = carts(sim, t), belted = beltOn(a, t);
  const waiting: Record<LavGroup, { p: Pax; ready: number }[]> = { front: [], rear: [] };
  const busy: State['busy'] = { front: [false], rear: [false, false] };

  const pax = sim.pax.map((p): Dot | null => {
    const seat = { x: p.sx, y: p.sy };
    if (t >= p.leaveAt) {
      const f = (t - p.leaveAt) / ((Math.abs(p.sx - DOOR[0]) + 90) / SPEED);
      if (f >= 1) return null;
      const [x, y] = along([[p.sx, p.sy], [p.sx, AISLE_Y], [DOOR[0], AISLE_Y], DOOR], f);
      return { x, y, cls: 'out' };
    }
    if (belted) return { ...seat, cls: 'sit' };              // the sign is on: everybody is in the seat
    const tr = p.trips.find((x) => t >= x.leave && t < x.back);
    if (tr) {
      const door = LAV[tr.grp].door;
      if (t < tr.ready) { const [x, y] = along([[p.sx, p.sy], [p.sx, AISLE_Y], [door, AISLE_Y]], (t - tr.leave) / (tr.ready - tr.leave)); return { x, y, cls: 'walk' }; }
      if (t < tr.start) { waiting[tr.grp].push({ p, ready: tr.ready }); return { x: door, y: AISLE_Y, cls: 'queue' }; }
      if (t < tr.end) { busy[tr.grp][tr.k] = true; return null; }
      const [x, y] = along([[door, AISLE_Y], [p.sx, AISLE_Y], [p.sx, p.sy]], (t - tr.end) / (tr.back - tr.end));
      return { x, y, cls: 'walk' };
    }
    if (sim.calls.some((c) => c.p === p && t >= c.t && t < c.done)) return { ...seat, cls: 'call' };
    const s = sim.sales;
    if (s && p.buys && t < a.tod && t >= s.at[p.row] && t < s.at[p.row] + s.stop[p.row]) return { ...seat, cls: 'buy' };
    if (served(sim, sim.meal, p.row) && t >= sim.meal!.at[p.row]) {
      const until = served(sim, sim.collect, p.row) ? sim.collect!.at[p.row] : a.tod + 4 * MIN;   // the cabin check takes the last trays
      if (t < until) return { ...seat, cls: 'eat' };
    }
    if (served(sim, sim.drink, p.row) && t >= sim.drink!.at[p.row] && t < sim.drink!.at[p.row] + 7 * MIN) return { ...seat, cls: 'drink' };
    if (p.sleeps && t >= p.sleepFrom && t < p.sleepTo) return { ...seat, cls: 'sleep' };
    return { ...seat, cls: 'sit' };
  });
  for (const g of ['front', 'rear'] as const) {
    waiting[g].sort((x, y) => x.ready - y.ready).forEach((e, k) => { pax[e.p.i]!.x = LAV[g].door + LAV[g].dir * (10 + k * 12); });
  }

  // crew: A and B work the front half, C and D the back
  const seated = (t >= a.off - 4 * MIN && t < a.beltOff) || (t >= a.beltOn && t < a.in);
  const demo = demoAt(a, t);
  const check = t >= a.tod + 4 * MIN && t < a.tod + 11 * MIN ? Math.abs(1 - (t - a.tod - 4 * MIN) / (3.5 * MIN)) : null;   // out and back
  const crew = {} as State['crew'];
  for (const id of ['A', 'B', 'C', 'D'] as const) {
    const team: LavGroup = id < 'C' ? 'front' : 'rear', lead = id === 'A' || id === 'C';
    const cart = cs.find((c) => c.team === team);
    const call = lead ? sim.calls.find((c) => c.team === team && t >= c.t + 25 * SEC && t < c.home) : undefined;
    const g = GALLEY[team];
    if (demo) crew[id] = [rowX(DEMO[id]), AISLE_Y];
    else if (seated) crew[id] = JUMP[id];
    else if (t >= a.in) crew[id] = team === 'front' ? [DOOR[0] + (lead ? 14 : 28), AISLE_Y + (lead ? 22 : -18)] : JUMP[id];
    else if (cart) crew[id] = [cart.x + (lead ? -17 : 17), AISLE_Y];
    else if (call) {
      const at: XY = [call.p.sx, AISLE_Y];
      crew[id] = t < call.arrive ? mix(g, at, (t - call.t - 25 * SEC) / (call.arrive - call.t - 25 * SEC)) : t < call.done ? at : mix(at, g, (t - call.done) / (call.home - call.done));
    } else if (check != null && lead) crew[id] = mix([rowX(team === 'front' ? MID_ROW : MID_ROW + 1), AISLE_Y], g, check);
    else crew[id] = [g[0] + (lead ? 0 : team === 'front' ? 10 : -10), AISLE_Y + (lead ? -9 : 9)];
  }
  return { belt: belted, carts: cs, pax, crew, queue: { front: waiting.front.length, rear: waiting.rear.length }, busy };
}

// ---------- what the panels show

// How far each service has got, 0–1; null when it is not part of this flight's plan.
export function progress(sim: Sim, t: number) {
  const of = (s: Service | null) => (s ? Math.min(1, Math.max(0, (Math.min(t, sim.a.tod) - s.start) / (s.end - s.start))) : null);
  return { drink: of(sim.drink), meal: of(sim.meal), sales: of(sim.sales) };
}

// Share of the passengers who got everything the plan promised (drinks, and the meal when there is one)
// before the descent started. null: no service was planned, or the sign never went off.
export function servedShare(sim: Sim): number | null {
  if (!sim.drink || !sim.pax.length) return null;
  const ok = sim.pax.filter((p) => served(sim, sim.drink, p.row) && (!sim.meal || served(sim, sim.meal, p.row))).length;
  return ok / sim.pax.length;
}

export function phaseLabel(sim: Sim, t: number): string {
  const { a } = sim;
  if (t < a.off - 4 * MIN) return demoAt(a, t) ? 'הסעה · הדגמת בטיחות' : 'הסעה להמראה';
  if (t < a.off) return 'מוכנים להמראה';
  if (t >= a.in) return sim.pax.some((p) => t < p.leaveAt + 60 * SEC) ? 'ירידה מהמטוס' : 'המטוס ריק';
  if (t >= a.on) return 'הסעה לגייט';
  if (t >= a.beltOn && Number.isFinite(a.beltOff)) return 'גישה לנחיתה · חגורים';
  if (t < a.beltOff) return t >= a.tod ? 'הנמכה · חגורים' : 'טיפוס · חגורים';
  if (t >= a.tod) return 'הנמכה · הכנת התא';
  const cart = carts(sim, t)[0]?.kind;
  if (cart === 'drink') return 'שירות שתייה';
  if (cart === 'meal') return 'שירות ארוחות';
  if (cart === 'collect') return 'איסוף מגשים';
  if (cart === 'sales') return 'מכירות';
  if (sim.drink && t < sim.drink.start) return 'השלט כבה · מתארגנים לשירות';
  if (sim.collect && t >= sim.meal!.end && t < sim.collect.start) return 'הנוסעים אוכלים';
  return t >= sim.quiet - 2 * MIN ? 'שיוט שקט' : 'שיוט';
}

// Only the aircraft in the picture: a 737 with up to 189 passengers.
export function cabinFits(type: string | null, pax: number | null): boolean {
  return Boolean(type && /^B73\d$|^B3[789]M$/.test(type) && pax != null && pax > 0 && pax <= SEATS.length);
}

// A night flight: more people sleep. Local time at the origin when the aircraft leaves.
export function isNight(outMs: number, utcOffsetH: number | null): boolean {
  const h = new Date(outMs + (utcOffsetH ?? 0) * 3600e3).getUTCHours();
  return h >= 21 || h < 6;
}
