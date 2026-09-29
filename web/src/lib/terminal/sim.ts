// Departure terminal simulation (sketch s7, ADR-053). Display only: nothing here
// touches the ledger. Deterministic per OFP: the seed is the OFP id, so the same
// plan always gives the same passengers, queues and boarding (ADR-006 spirit).
// Every passenger's full timeline is computed once (FIFO multi-server queues);
// the screen only reads the state at a given moment.

export type Size = 'large' | 'medium' | 'small';
export type QueueId = 'checkin' | 'bagdrop' | 'security' | 'passport' | 'boarding';
export type StationId = 'terminal' | QueueId | 'dutyfree' | 'gate' | 'aircraft';
export type Kind = 'dwell' | 'queue' | 'seat';
export type Station = { id: StationId; he: string; en: string; kind: Kind; svc?: [number, number]; c: string };

export const STATIONS: Station[] = [
  { id: 'terminal', he: 'טרמינל', en: 'TERMINAL', kind: 'dwell', c: '#8b93a0' },
  { id: 'checkin', he: "צ'ק-אין", en: 'CHECK-IN', kind: 'queue', svc: [1.6, 3.4], c: '#c08a2e' },
  { id: 'bagdrop', he: 'מסירת מזוודות', en: 'BAG DROP', kind: 'queue', svc: [0.7, 1.4], c: '#d0703b' },
  { id: 'security', he: 'בידוק ביטחוני', en: 'SECURITY', kind: 'queue', svc: [0.9, 1.9], c: '#d2553f' },
  { id: 'passport', he: 'ביקורת דרכונים', en: 'PASSPORT', kind: 'queue', svc: [0.4, 1.1], c: '#8f6ad6' },
  { id: 'dutyfree', he: 'דיוטי-פרי', en: 'DUTY FREE', kind: 'dwell', c: '#c56cf0' },
  { id: 'gate', he: 'שער', en: 'GATE', kind: 'dwell', c: '#5f86b0' },
  { id: 'boarding', he: 'עלייה', en: 'BOARDING', kind: 'queue', svc: [0.1, 0.16], c: '#2f8cff' },
  { id: 'aircraft', he: 'במטוס', en: 'AIRCRAFT', kind: 'seat', c: '#22c55e' },
];
export const SI = Object.fromEntries(STATIONS.map((s, i) => [s.id, i])) as Record<StationId, number>;

// The terminal plan has 8 desks, 8 kiosks, 4 lanes and 4 booths. One flight gets
// a share by airport size (OurAirports type), as indexes into the plan's stations,
// picked next to where each queue forms on the map.
export const OPEN: Record<Size, Record<QueueId, number[]>> = {
  large: { checkin: [0, 1, 2, 3], bagdrop: [5, 6, 7], security: [1, 2, 3], passport: [0, 1], boarding: [0] },
  medium: { checkin: [0, 1, 2], bagdrop: [5, 6, 7], security: [1, 2, 3], passport: [0, 1], boarding: [0] },
  small: { checkin: [0, 1, 2], bagdrop: [6, 7], security: [2, 3], passport: [0, 1], boarding: [0] },
};
export const sizeOf = (type: string | null | undefined): Size =>
  type === 'large_airport' ? 'large' : type === 'medium_airport' ? 'medium' : type === 'small_airport' ? 'small' : 'medium';

const WALK: Record<StationId, number> = { terminal: 2, checkin: 1.5, bagdrop: 2.5, security: 3, passport: 1.5, dutyfree: 3, gate: 0, boarding: 1.5, aircraft: 0 };
const MIX = { online: 0.42, dutyfree: 0.6, groupShare: 0.35, late: 0.04 };
export const MIN = 60_000;

export type Step = { st: number; ready: number; start: number; end: number; server?: number };
export type Pax = {
  i: number; grp: number; arr: number; online: boolean; bag: boolean; shop: boolean; jx: number; jy: number;
  seat: { r: number; c: number }; zone: 1 | 2 | 3 | 4; steps: Step[]; late: boolean; seated: number | null;
};
export type SimInput = { seed: string; pax: number; bags: number | null; seats: number | null; outMs: number; size: Size };
export type Sim = {
  input: SimInput; t0: number; start: number; end: number;
  boardOpen: number; gateClose: number; doorClose: number; zoneCall: Record<1 | 2 | 3 | 4, number>;
  open: Record<QueueId, number[]>; servers: Record<QueueId, number>; rows: number; pax: Pax[];
};

export function rng(seed: string, salt = 0) {
  let h = 2166136261 ^ salt;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  let a = h;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function simulate(input: SimInput): Sim {
  const rnd = rng(input.seed);
  const uni = (a: number, b: number) => a + (b - a) * rnd();
  const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const T0 = input.outMs, n = Math.max(0, Math.round(input.pax));
  const bags = Math.min(n, Math.max(0, Math.round(input.bags ?? n)));
  const start = T0 - 200 * MIN, end = T0 + 2 * MIN;
  const boardOpen = T0 - 40 * MIN, gateClose = T0 - 15 * MIN;
  const open = OPEN[input.size];
  const servers = Object.fromEntries(Object.entries(open).map(([id, l]) => [id, l.length])) as Record<QueueId, number>;

  // Arrivals: groups arrive together, a few passengers cut it close.
  const P: Pax[] = [];
  for (let i = 0; i < n;) {
    const grp = rnd() < MIX.groupShare ? Math.min(n - i, 2 + Math.floor(rnd() * 3)) : 1;
    const late = rnd() < MIX.late;
    const before = late ? 48 + gauss() * 4 : Math.max(62, Math.min(195, 118 + gauss() * 26));
    const arr = T0 - before * MIN, online = rnd() < MIX.online;
    for (let g = 0; g < grp; g++, i++) {
      P.push({ i, grp: g, arr: arr + g * uni(0.05, 0.3) * MIN, online, bag: i < bags, shop: rnd() < MIX.dutyfree, jx: rnd(), jy: rnd(),
        seat: { r: 0, c: 0 }, zone: 4, steps: [], late: false, seated: null });
    }
  }

  // Seats and boarding zones: front, then back to front.
  const rows = Math.max(1, Math.ceil(Math.max(input.seats ?? 0, n) / 6));
  const seatList: { r: number; c: number }[] = [];
  for (let r = 1; r <= rows; r++) for (let c = 0; c < 6; c++) seatList.push({ r, c });
  for (let k = seatList.length - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [seatList[k], seatList[j]] = [seatList[j], seatList[k]]; }
  const z1 = Math.max(2, Math.round(rows * 0.125)), z2 = Math.round(rows * 0.68), z3 = Math.round(rows * 0.37);
  P.forEach((p, k) => {
    p.seat = seatList[k]; const r = p.seat.r;
    p.zone = r <= z1 || rnd() < 0.08 ? 1 : r >= z2 ? 2 : r >= z3 ? 3 : 4;
  });
  const zoneCall = { 1: boardOpen, 2: boardOpen + 4 * MIN, 3: boardOpen + 11 * MIN, 4: boardOpen + 18 * MIN };

  const runQueue = (list: { p: Pax; ready: number; start?: number; end?: number; server?: number }[], k: number, svc: [number, number]) => {
    const free = Array(k).fill(-Infinity);
    list.sort((a, b) => a.ready - b.ready);
    for (const x of list) {
      let s = 0; for (let j = 1; j < k; j++) if (free[j] < free[s]) s = j;
      x.start = Math.max(x.ready, free[s]); x.server = s;
      x.end = x.start + uni(svc[0], svc[1]) * MIN * (x.p.grp > 0 && x.p.online ? 0.4 : 1);
      free[s] = x.end;
    }
  };
  const queueStep = (id: QueueId, who: Pax[], ready: number[]) => {
    const L = who.map((p) => ({ p, ready: ready[p.i] } as { p: Pax; ready: number; start: number; end: number; server: number }));
    runQueue(L, servers[id], STATIONS[SI[id]].svc!);
    for (const x of L) { x.p.steps.push({ st: SI[id], ready: x.ready, start: x.start, end: x.end, server: x.server }); ready[x.p.i] = x.end + WALK[id] * MIN; }
  };

  const ready = P.map((p) => p.arr);
  P.forEach((p) => { const s = { st: SI.terminal, ready: p.arr, start: p.arr, end: p.arr + uni(0.8, 3) * MIN }; p.steps.push(s); ready[p.i] = s.end + WALK.terminal * MIN; });
  queueStep('checkin', P.filter((p) => !p.online), ready);
  queueStep('bagdrop', P.filter((p) => p.bag), ready);
  P.filter((p) => !p.bag).forEach((p) => { ready[p.i] += WALK.bagdrop * MIN; });
  queueStep('security', P, ready);
  queueStep('passport', P, ready);
  P.forEach((p) => {
    if (!p.shop) { ready[p.i] += WALK.dutyfree * MIN; return; }
    const want = uni(8, 38) * MIN, latest = zoneCall[p.zone] - WALK.dutyfree * MIN - uni(2, 8) * MIN;
    const e = Math.max(ready[p.i] + 2 * MIN, Math.min(ready[p.i] + want, latest));
    p.steps.push({ st: SI.dutyfree, ready: ready[p.i], start: ready[p.i], end: e }); ready[p.i] = e + WALK.dutyfree * MIN;
  });
  P.forEach((p) => {
    const at = ready[p.i]; p.late = at > gateClose;
    const leave = p.late ? end + 60 * MIN : Math.max(at, zoneCall[p.zone]);
    p.steps.push({ st: SI.gate, ready: at, start: at, end: leave }); ready[p.i] = leave;
  });
  const boarders = P.filter((p) => !p.late);
  const B = boarders.map((p) => ({ p, ready: ready[p.i] } as { p: Pax; ready: number; start: number; end: number; server: number }));
  runQueue(B, servers.boarding, STATIONS[SI.boarding].svc!);
  for (const x of B) {
    x.p.steps.push({ st: SI.boarding, ready: x.ready, start: x.start, end: x.end, server: 0 });
    const seatedAt = x.end + (WALK.boarding + uni(0.5, 2.2)) * MIN;
    x.p.steps.push({ st: SI.aircraft, ready: x.end + WALK.boarding * MIN, start: seatedAt, end: Infinity });
    x.p.seated = seatedAt;
  }
  const lastSeated = B.length ? Math.max(...B.map((x) => x.p.seated!)) : gateClose;
  const doorClose = Math.max(lastSeated + 2 * MIN, gateClose + 5 * MIN);
  return { input, t0: T0, start, end, boardOpen, gateClose, doorClose, zoneCall, open, servers, rows, pax: P };
}

export type StationState = { queue: { p: Pax; ready: number }[]; serve: number; dwell: number; done: number; waits: number[]; walking: number };
export type Where =
  | { kind: 'walk'; step: number; f: number }
  | { kind: 'queue'; st: number }
  | { kind: 'serve'; st: number; server: number; f: number }
  | { kind: 'dwell'; st: number }
  | { kind: 'late' }
  | { kind: 'stow'; f: number }
  | { kind: 'seat' };

// Who is where at time t. Queues are ordered by arrival, front first.
export function stateAt(sim: Sim, t: number): { S: StationState[]; pos: (Where | null)[] } {
  const S: StationState[] = STATIONS.map(() => ({ queue: [], serve: 0, dwell: 0, done: 0, waits: [], walking: 0 }));
  const pos: (Where | null)[] = new Array(sim.pax.length).fill(null);
  for (const p of sim.pax) {
    if (t < p.arr) continue;
    for (let k = 0; k < p.steps.length; k++) {
      const s = p.steps[k], kind = STATIONS[s.st].kind;
      if (s.end <= t) { S[s.st].done++; if (kind === 'queue') S[s.st].waits.push(s.start - s.ready); continue; }
      if (t < s.ready) {
        const t0 = k ? p.steps[k - 1].end : p.arr;
        pos[p.i] = { kind: 'walk', step: k, f: Math.min(1, Math.max(0, (t - t0) / Math.max(1, s.ready - t0))) };
        S[s.st].walking++;
      } else if (kind === 'seat') { pos[p.i] = t >= s.start ? { kind: 'seat' } : { kind: 'stow', f: (t - s.ready) / Math.max(1, s.start - s.ready) }; S[s.st].dwell++; }
      else if (kind === 'dwell') { pos[p.i] = s.st === SI.gate && p.late ? { kind: 'late' } : { kind: 'dwell', st: s.st }; S[s.st].dwell++; }
      else if (t < s.start) { pos[p.i] = { kind: 'queue', st: s.st }; S[s.st].queue.push({ p, ready: s.ready }); }
      else { pos[p.i] = { kind: 'serve', st: s.st, server: s.server ?? 0, f: (t - s.start) / Math.max(1, s.end - s.start) }; S[s.st].serve++; }
      break;
    }
  }
  S.forEach((x) => x.queue.sort((a, b) => a.ready - b.ready));
  return { S, pos };
}

// Expected wait for someone joining the queue now, in whole minutes (null: not a queue).
export function expWait(sim: Sim, st: number, x: StationState): number | null {
  const d = STATIONS[st];
  if (d.kind !== 'queue') return null;
  return Math.round((x.queue.length * (d.svc![0] + d.svc![1])) / 2 / sim.servers[d.id as QueueId]);
}

// The after-pushback summary: who made it, when the door closed, the worst queue.
export function summary(sim: Sim) {
  const boarded = sim.pax.filter((p) => p.seated != null).length;
  let worst: { st: number; avgMin: number } | null = null;
  for (const [st, d] of STATIONS.entries()) {
    if (d.kind !== 'queue' || d.id === 'boarding') continue;
    const w = sim.pax.flatMap((p) => p.steps.filter((s) => s.st === st).map((s) => s.start - s.ready));
    const avg = w.length ? w.reduce((a, b) => a + b, 0) / w.length / MIN : 0;
    if (!worst || avg > worst.avgMin) worst = { st, avgMin: avg };
  }
  const trip = sim.pax.filter((p) => p.seated != null).map((p) => (p.seated! - p.arr) / MIN);
  return {
    boarded, late: sim.pax.length - boarded, doorClose: sim.doorClose,
    bottleneck: worst, avgTripMin: trip.length ? Math.round(trip.reduce((a, b) => a + b, 0) / trip.length) : null,
  };
}
