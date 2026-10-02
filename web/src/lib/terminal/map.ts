// Geometry of the terminal plan (public/terminal-topdown.jpg, 1776 × 896 px),
// calibrated on the image (sketch s7 v3). Everything is in image pixels; the
// screen scales the SVG. Pure: no DOM.
import { rng, SI, STATIONS, type Pax, type QueueId, type Sim, type StationId, type Where } from './sim';

export const MAP_W = 1776, MAP_H = 896;
type Pt = [number, number];

// Every station the plan shows; the flight uses the ones in sim.open.
const ALL: Record<QueueId, { stand: Pt[]; ring: Pt[] }> = {
  checkin: { stand: [277, 327, 385, 435, 485, 535, 592, 642].map((y) => [325, y]), ring: [277, 327, 385, 435, 485, 535, 592, 642].map((y) => [298, y]) },
  bagdrop: { stand: [297, 332, 387, 422, 477, 510, 562, 600].map((y) => [582, y]), ring: [297, 332, 387, 422, 477, 510, 562, 600].map((y) => [550, y]) },
  // stands at the start of the lane, walks along the belt through the arch to x 878 while served
  security: { stand: [315, 402, 492, 582].map((y) => [660, y]), ring: [315, 402, 492, 582].map((y) => [778, y]) },
  passport: { stand: [324, 406, 492, 578].map((y) => [948, y]), ring: [324, 406, 492, 578].map((y) => [948, y]) },
  boarding: { stand: [[1342, 475]], ring: [[1365, 475]] },
};
const SEC_EXIT_X = 878;

// Queue lanes, front first: [from, to].
const LANES: Record<QueueId, [Pt, Pt][]> = {
  checkin: [[[352, 300], [352, 618]], [[377, 618], [377, 300]], [[402, 300], [402, 618]], [[428, 618], [428, 300]], [[453, 300], [453, 618]]],
  bagdrop: [[[596, 632], [526, 632]], [[526, 652], [596, 652]], [[596, 672], [526, 672]]],
  security: [[[645, 632], [905, 632]], [[905, 650], [645, 650]], [[645, 668], [905, 668]], [[905, 686], [645, 686]]],
  passport: [[[912, 280], [700, 280]], [[700, 262], [912, 262]], [[912, 244], [700, 244]]],
  boarding: [[[1344, 494], [1344, 684]], [[1330, 686], [1196, 686]], [[1196, 668], [1330, 668]], [[1330, 650], [1196, 650]]],
};
const CURB: Pt[] = [[90, 442], [218, 445], [240, 445]];                     // crosswalk → glass doors → hall
const BRIDGE: Pt[] = [[1345, 512], [1388, 512], [1400, 478], [1570, 478], [1598, 475]];
const DOOR: Pt = [1598, 475], AISLE_X = 1620;
const SEAT_X = [1603, 1609, 1615, 1625, 1631, 1637];

// Corridors between stations; -1 keeps the start x / y.
const WAY: Record<string, Pt[]> = {
  'terminal>checkin': [[485, -1], [485, 635]],
  'terminal>bagdrop': [[485, -1], [485, 650], [512, 650], [518, 672]],
  'terminal>security': [[485, -1], [485, 650], [512, 650], [603, 686]],
  'checkin>bagdrop': [[-1, 650], [512, 650], [518, 672]],
  'checkin>security': [[-1, 650], [512, 650], [603, 686]],
  'bagdrop>security': [[603, -1], [603, 686]],
  'security>passport': [[895, -1], [895, 226], [700, 226]],
  'passport>dutyfree': [[1015, -1], [1015, 290], [1046, 290]],
  'passport>gate': [[1015, -1], [1015, 650], [1190, 650]],
  'dutyfree>gate': [[1142, -1], [1142, 618], [1170, 640], [1190, 640]],
  'boarding>aircraft': BRIDGE,
};

// Where the station labels sit: on the apron, above or below their own zone.
export const CHIP_AT: Record<StationId, Pt> = {
  terminal: [168, 120], checkin: [390, 150], bagdrop: [565, 752], security: [765, 150], passport: [962, 752],
  dutyfree: [1098, 150], gate: [1285, 752], boarding: [1480, 752], aircraft: [1668, 110],
};

const SPACING = 11;
function laneSlot(id: QueueId, k: number): Pt {
  for (const [a, b] of LANES[id]) {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]), cap = Math.floor(L / SPACING) + 1;
    if (k < cap) return [a[0] + ((b[0] - a[0]) / L) * k * SPACING, a[1] + ((b[1] - a[1]) / L) * k * SPACING];
    k -= cap;
  }
  const b = LANES[id].at(-1)![1]; return [b[0] + (k % 3) * 6, b[1] - Math.floor(k / 3) * 6];
}
const laneTail = (id: QueueId) => LANES[id].at(-1)![1];

export function polyAt(pts: Pt[], f: number): Pt {
  if (pts.length < 2) return pts[0];
  const seg: number[] = []; let L = 0;
  for (let k = 1; k < pts.length; k++) { const d = Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]); seg.push(d); L += d; }
  let target = Math.min(1, Math.max(0, f)) * L;
  for (let k = 0; k < seg.length; k++) {
    if (target <= seg[k] || k === seg.length - 1) {
      const t = seg[k] ? Math.min(1, target / seg[k]) : 1;
      return [pts[k][0] + (pts[k + 1][0] - pts[k][0]) * t, pts[k][1] + (pts[k + 1][1] - pts[k][1]) * t];
    }
    target -= seg[k];
  }
  return pts.at(-1)!;
}

export type Layout = {
  stations: Record<QueueId, Pt[]>;         // open stands, by server index
  rings: Record<QueueId, Pt[]>;            // what lights up while busy
  closed: Pt[];                            // stations of other flights
  walks: Pt[][][];                         // per passenger, per step
  gateSpot: Pt[]; seatSpot: Pt[];          // per passenger
};

// Everything position-related for one simulation, computed once.
export function layout(sim: Sim): Layout {
  const stations = {} as Layout['stations'], rings = {} as Layout['rings'], closed: Pt[] = [];
  for (const id of Object.keys(ALL) as QueueId[]) {
    const open = sim.open[id];
    stations[id] = open.map((k) => ALL[id].stand[k]);
    rings[id] = open.map((k) => ALL[id].ring[k]);
    ALL[id].ring.forEach((pt, k) => { if (!open.includes(k)) closed.push(pt); });
  }

  // Gate lounge: 11 blocks of 2 × 4 seats (the third bank has two blocks), filled
  // in a shuffled order by time of arrival; the rest stand.
  const seats: Pt[] = [];
  [[304, 319, 333, 348], [390, 404, 418, 433], [475, 490, 504, 519], [562, 577, 591, 606]].forEach((ys, bank) =>
    [[1227, 1243], [1268, 1284], [1310, 1326]].slice(0, bank === 2 ? 2 : 3).forEach((xs) => ys.forEach((y) => xs.forEach((x) => seats.push([x, y])))));
  const r = rng(sim.input.seed, 1);
  for (let k = seats.length - 1; k > 0; k--) { const j = Math.floor(r() * (k + 1)); [seats[k], seats[j]] = [seats[j], seats[k]]; }
  const gateAt = (p: Pax) => p.steps.find((s) => s.st === SI.gate)!.ready;
  const order = new Array<number>(sim.pax.length);
  [...sim.pax].sort((a, b) => gateAt(a) - gateAt(b)).forEach((p, k) => { order[p.i] = k; });
  const gateSpot = sim.pax.map((p): Pt => {
    const k = order[p.i];
    if (k < seats.length) return seats[k];
    const j = k - seats.length;
    if (j < 78) return [1202 + (j % 13) * 11, 222 + Math.floor(j / 13) * 12];       // standing above the seats
    const m = j - 78; return [1350 + (m % 3) * 12, 300 + Math.floor(m / 3) * 11];     // then by the window, above the podium
  });
  // the lounge aisle to a seat, so no one cuts across the rows
  const aisle = (p: Pax): Pt[] => {
    const [x, y] = gateSpot[p.i];
    const ax = order[p.i] >= seats.length ? (x >= 1345 ? 1340 : 1196) : x < 1255 ? 1213 : x < 1297 ? 1255 : 1296;
    return [[ax, 645], [ax, y]];
  };

  const pitch = Math.min(10, 310 / Math.max(1, sim.rows - 1));
  const seatSpot = sim.pax.map((p): Pt => [SEAT_X[p.seat.c], 230 + (p.seat.r - 1) * pitch]);

  const dwell = (id: 'terminal' | 'dutyfree', p: Pax): Pt => {
    if (id === 'terminal') return p.jx < 0.5
      ? [330 + p.jx * 2 * 170, 215 + p.jy * 42]               // hall above the check-in stanchions
      : [340 + (p.jx - 0.5) * 2 * 130, 656 + p.jy * 32];      // and below them
    const a = Math.min(2, Math.floor(p.jx * 3));              // duty free: the three aisles between the shelves
    return [[1046, 1092, 1142][a] + (((p.jx * 3) % 1) - 0.5) * 8, 295 + p.jy * 315];
  };
  const exitPoint = (st: number, server: number | undefined, p: Pax): Pt => {
    const id = STATIONS[st].id;
    if (id === 'terminal' || id === 'dutyfree') return dwell(id, p);
    if (id === 'gate') return gateSpot[p.i];
    const [x, y] = stations[id as QueueId][server ?? 0];
    if (id === 'security') return [SEC_EXIT_X, y];
    if (id === 'passport') return [990, y];
    return [x, y];
  };
  const entryPoint = (st: number, p: Pax): Pt => {
    const id = STATIONS[st].id;
    if (id in LANES) return laneTail(id as QueueId);
    if (id === 'dutyfree') return dwell('dutyfree', p);
    if (id === 'gate') return gateSpot[p.i];
    if (id === 'aircraft') return DOOR;
    return dwell('terminal', p);
  };

  const walks = sim.pax.map((p) => p.steps.map((s, k): Pt[] => {
    if (k === 0) { const d = dwell('terminal', p); return [...CURB, [240, d[1]], d]; }
    const prev = p.steps[k - 1], a = exitPoint(prev.st, prev.server, p), b = entryPoint(s.st, p);
    const from = STATIONS[prev.st].id, to = STATIONS[s.st].id;
    const way = (WAY[`${from}>${to}`] ?? []).map(([x, y]): Pt => [x === -1 ? a[0] : x, y === -1 ? a[1] : y]);
    if (to === 'gate') way.push(...aisle(p));
    if (from === 'gate') way.unshift(...aisle(p).reverse());
    return [a, ...way, b];
  }));

  return { stations, rings, closed, walks, gateSpot, seatSpot };
}

export type DotClass = 'walk' | 'queue' | 'serve' | 'shop' | 'gate' | 'seat' | 'late';

// Where to draw a passenger, given where they are in the simulation.
export function place(L: Layout, p: Pax, w: Where, queueIndex: number): { xy: Pt; cls: DotClass } {
  switch (w.kind) {
    case 'walk': return { xy: polyAt(L.walks[p.i][w.step], w.f), cls: 'walk' };
    case 'queue': return { xy: laneSlot(STATIONS[w.st].id as QueueId, queueIndex), cls: 'queue' };
    case 'serve': {
      const id = STATIONS[w.st].id as QueueId, [x, y] = L.stations[id][w.server];
      return { xy: id === 'security' ? [x + (SEC_EXIT_X - x) * Math.min(1, w.f), y] : [x, y], cls: 'serve' };
    }
    case 'dwell': {
      const id = STATIONS[w.st].id;
      if (id === 'gate') return { xy: L.gateSpot[p.i], cls: 'gate' };
      const d = L.walks[p.i].find((_, k) => p.steps[k].st === w.st);    // the walk into this station ends where they dwell
      return { xy: d ? d.at(-1)! : [0, 0], cls: id === 'dutyfree' ? 'shop' : 'walk' };
    }
    case 'late': return { xy: L.gateSpot[p.i], cls: 'late' };
    case 'stow': { const s = L.seatSpot[p.i]; return { xy: polyAt([DOOR, [AISLE_X, DOOR[1]], [AISLE_X, s[1]], s], w.f), cls: 'serve' }; }
    case 'seat': return { xy: L.seatSpot[p.i], cls: 'seat' };
  }
}
