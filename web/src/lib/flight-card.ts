// Flight summary as a picture (sketch s11, ADR-059). Pure: builds a list of
// drawing instructions for a 1080 × 1080 card; the browser paints them on a
// canvas (logbook/FlightCard.tsx). Every number comes from the closed flight.
import { geoAzimuthalEqualArea, geoDistance, geoInterpolate, geoPath, type GeoPermissibleObjects } from 'd3-geo';

export const CARD = 1080;
export type CardLang = 'he' | 'en';
type Pt = [number, number];

export type CardAirport = { icao: string; name: string | null; lat: number | null; lon: number | null };
export type CardData = {
  callsign: string | null; type: string | null; reg: string | null; date: string;
  from: CardAirport; to: CardAirport; plannedTo: string | null;        // plannedTo: set when the flight diverted
  times: { out: string | null; off: string | null; on: string | null; in: string | null };
  blockMin: number | null; airMin: number | null; fpm: number | null;
  pax: number | null; seats: number | null;
  score: number | null; depLateMin: number | null;
  profitCents: number; source: 'tracked' | 'partial' | 'manual' | 'historical';
};

// ---------- the route map: fitted to the two airports, centred between them

const MAP_W = 960, MAP_H = 430;
export type CardMap = { land: string; borders: string; arc: string; a: Pt; b: Pt; nm: number };

export function cardMap(land: GeoPermissibleObjects, borders: GeoPermissibleObjects, from: Pt, to: Pt): CardMap {
  const nm = Math.round(geoDistance(from, to) * 3440.065);
  const mid = geoInterpolate(from, to)(0.5);
  const line: GeoPermissibleObjects = { type: 'LineString', coordinates: Array.from({ length: 65 }, (_, i) => geoInterpolate(from, to)(i / 64)) };
  const proj = geoAzimuthalEqualArea().rotate([-mid[0], -mid[1]]);
  if (nm < 1) proj.scale(4000).translate([MAP_W / 2, MAP_H / 2]);
  else {
    proj.fitExtent([[170, 110], [MAP_W - 170, MAP_H - 110]], line);
    if (proj.scale() > 6000) proj.scale(6000).translate([MAP_W / 2, MAP_H / 2]);      // a short hop: don't zoom into the apron
  }
  proj.clipExtent([[0, 0], [MAP_W, MAP_H]]);
  const path = geoPath(proj).digits(1);
  const r = (p: Pt | null): Pt => (p ? [Math.round(p[0]), Math.round(p[1])] : [MAP_W / 2, MAP_H / 2]);
  return { land: path(land) ?? '', borders: path(borders) ?? '', arc: path(line) ?? '', a: r(proj(from)), b: r(proj(to)), nm };
}

// ---------- the scene

export type Align = 'left' | 'center' | 'right';
export type Seg = { s: string; size: number; weight: number; fill: string; dx?: number };
export type Item =
  | { t: 'rect'; x: number; y: number; w: number; h: number; r?: number; fill?: string; stroke?: string }
  | { t: 'line'; x1: number; y1: number; x2: number; y2: number; stroke: string }
  | { t: 'text'; x: number; y: number; s: string; size: number; weight: number; fill: string; align: Align; rtl?: boolean; spacing?: number; halo?: string }
  | { t: 'run'; cx: number; y: number; parts: Seg[] }                                  // LTR pieces of different sizes, centred together
  | { t: 'map'; x: number; y: number; w: number; h: number; r: number; map: CardMap | null; sea: string; land: string; border: string; arc: string; frame: string }
  | { t: 'dot'; x: number; y: number; r: number; fill: string; stroke: string; width: number };

const C = { bg: '#0b1119', ink: '#eef2f6', muted: '#8fa0b3', faint: '#5f6f82', line: '#243040', accent: '#5b9df0', go: '#43c083', bad: '#f07167', cell: '#101823', sea: '#0b1826', star: '#f0b13a', starOff: '#2c3644' };

// The four block times keep their English names in both languages (the user, 02.10.2026).
export const TIME_NAMES = ['PUSHBACK', 'TAKEOFF', 'LANDING', 'GATE'] as const;

const TXT = {
  he: {
    block: 'זמן בלוק', air: 'זמן באוויר', landing: 'נחיתה', pax: 'נוסעים', score: 'ציון הטיסה', profit: 'רווח נקי', loss: 'הפסד',
    dep: 'יציאה', onTime: 'בזמן', late: 'באיחור', lf: (p: number) => `${p}% תפוסה`, soft: 'נחיתה רכה', normal: 'נחיתה רגילה', hard: 'נחיתה קשה',
    src: { tracked: 'נעקבה ב-VATSIM', partial: 'נעקבה חלקית ב-VATSIM', manual: 'טיסה ידנית', historical: '' }, planned: (i: string) => `הוסטה · היעד המתוכנן ${i}`,
    months: ['בינואר', 'בפברואר', 'במרץ', 'באפריל', 'במאי', 'ביוני', 'ביולי', 'באוגוסט', 'בספטמבר', 'באוקטובר', 'בנובמבר', 'בדצמבר'],
  },
  en: {
    block: 'Block time', air: 'Air time', landing: 'Landing', pax: 'Passengers', score: 'Flight score', profit: 'Net profit', loss: 'Net loss',
    dep: 'Departure', onTime: 'On time', late: 'Late', lf: (p: number) => `${p}% load`, soft: 'Soft landing', normal: 'Normal landing', hard: 'Hard landing',
    src: { tracked: 'Tracked on VATSIM', partial: 'Partly tracked on VATSIM', manual: 'Manual flight', historical: '' }, planned: (i: string) => `Diverted · planned ${i}`,
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  },
} as const;

const hm = (min: number | null) => (min == null ? '—' : `${Math.floor(min / 60)}:${String(Math.round(min % 60)).padStart(2, '0')}`);
const hhmm = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(11, 16) : '—');
export const cardMoney = (cents: number) => `${cents < 0 ? '−' : '+'}$${Math.round(Math.abs(cents) / 100).toLocaleString('en-US')}`;

export function cardScene(d: CardData, map: CardMap | null, o: { lang: CardLang; profit: boolean }): Item[] {
  const t = TXT[o.lang], he = o.lang === 'he';
  // The start edge is on the right in Hebrew; the map stays a map.
  const S = he ? 1020 : 60, E = he ? 60 : 1020, sAlign: Align = he ? 'right' : 'left', eAlign: Align = he ? 'left' : 'right';
  const dt = new Date(d.date), date = `${dt.getUTCDate()} ${t.months[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`;
  const items: Item[] = [{ t: 'rect', x: 0, y: 0, w: CARD, h: CARD, fill: C.bg }];
  const text = (x: number, y: number, s: string, size: number, weight: number, fill: string, align: Align, extra: Partial<Extract<Item, { t: 'text' }>> = {}) =>
    items.push({ t: 'text', x, y, s, size, weight, fill, align, ...extra });

  // header
  text(S, 92, d.callsign ?? '—', 64, 800, C.ink, sAlign);
  text(S, 134, [d.type, d.reg].filter(Boolean).join(' · '), 26, 400, C.muted, sAlign);
  text(E, 76, 'SMARTLOGBOOK', 22, 700, C.faint, eAlign, { spacing: 3 });
  text(E, 118, date, 28, 600, C.ink, eAlign, { rtl: he });

  // map
  const MX = 60, MY = 168;
  items.push({ t: 'map', x: MX, y: MY, w: MAP_W, h: MAP_H, r: 18, map, sea: C.sea, land: '#1b2634', border: '#2b394b', arc: C.accent, frame: C.line });
  const a: Pt = map ? map.a : [MAP_W * 0.3, MAP_H / 2], b: Pt = map ? map.b : [MAP_W * 0.7, MAP_H / 2];
  const same = Math.hypot(a[0] - b[0], a[1] - b[1]) < 40;
  // the upper airport is labelled above its dot, the lower one below, so neither label sits on the line
  const upperIsA = a[1] <= b[1];
  ([[a, d.from, upperIsA], [b, d.to, !upperIsA]] as [Pt, CardAirport, boolean][]).forEach(([p, ap, above], k) => {
    if (same && k === 1) return;
    const x = MX + p[0], y = MY + p[1];
    items.push({ t: 'dot', x, y, r: 11, fill: C.sea, stroke: C.accent, width: 4 });
    text(x, y + (above ? -26 : 48), same ? `${d.from.icao} · ${d.to.icao}` : ap.icao, 34, 800, C.ink, 'center', { halo: C.sea });
    if (ap.name && !same) text(x, y + (above ? -64 : 78), ap.name, 22, 400, C.muted, 'center', { halo: C.sea });
  });
  if (map && !same) {
    const cx = MX + (a[0] + b[0]) / 2, cy = MY + (a[1] + b[1]) / 2 - 30;
    items.push({ t: 'rect', x: cx - 78, y: cy - 22, w: 156, h: 40, r: 20, fill: C.sea, stroke: C.line });
    text(cx, cy + 6, `${map.nm.toLocaleString('en-US')} NM`, 22, 700, C.ink, 'center');
  }
  if (d.plannedTo) text(he ? MX + MAP_W - 20 : MX + 20, MY + MAP_H - 18, t.planned(d.plannedTo), 20, 600, C.muted, he ? 'right' : 'left', { rtl: he, halo: C.sea });

  // five figures: three on the first row, two wide ones on the second
  type Cell = { label: string; value: Seg[]; sub?: string; stars?: number };
  const big = (s: string, fill = C.ink): Seg => ({ s, size: 54, weight: 800, fill });
  const unit = (s: string): Seg => ({ s, size: 24, weight: 600, fill: C.muted, dx: 8 });
  const abs = d.fpm == null ? null : Math.abs(d.fpm), lf = d.pax != null && d.seats ? Math.round((d.pax / d.seats) * 100) : null;
  const cells: Cell[] = [
    { label: t.block, value: [big(hm(d.blockMin))], sub: d.depLateMin == null ? undefined : `${t.dep}: ${d.depLateMin <= 15 ? t.onTime : t.late}` },
    { label: t.landing, value: abs == null ? [big('—')] : [big(`−${abs}`), unit('FPM')], sub: abs == null ? undefined : abs <= 200 ? t.soft : abs > 400 ? t.hard : t.normal },
    { label: t.score, value: [big(d.score == null ? '—' : d.score.toFixed(1))], stars: d.score ?? undefined },
    { label: t.pax, value: d.pax == null ? [big('—')] : d.seats ? [big(String(d.pax)), unit(`/ ${d.seats}`)] : [big(String(d.pax))], sub: lf == null ? undefined : t.lf(lf) },
    o.profit
      ? { label: d.profitCents < 0 ? t.loss : t.profit, value: [big(cardMoney(d.profitCents), d.profitCents < 0 ? C.bad : C.go)] }
      : { label: t.air, value: [big(hm(d.airMin))] },
  ];
  const cell = (c: Cell, x: number, w: number, y: number) => {
    const cx = x + w / 2;
    items.push({ t: 'rect', x, y, w, h: 150, r: 14, fill: C.cell, stroke: C.line });
    text(cx, y + 38, c.label, 22, 600, C.muted, 'center', { rtl: he });
    items.push({ t: 'run', cx, y: y + 96, parts: c.value });
    if (c.stars != null) for (let i = 0; i < 5; i++) text(cx - 50 + i * 25, y + 132, '★', 24, 400, i < Math.round(c.stars) ? C.star : C.starOff, 'center');
    else if (c.sub) text(cx, y + 130, c.sub, 21, 400, C.muted, 'center', { rtl: he });
  };
  [0, 1, 2].forEach((i) => cell(cells[he ? 2 - i : i], 60 + i * 325, 310, 622));
  [0, 1].forEach((i) => cell(cells[3 + (he ? 1 - i : i)], 60 + i * 487.5, 472.5, 790));

  // the four times, on the start side; where the flight came from, on the far side
  items.push({ t: 'line', x1: 60, y1: 968, x2: 1020, y2: 968, stroke: C.line });
  [d.times.out, d.times.off, d.times.on, d.times.in].forEach((v, i) => {
    const cx = he ? 1020 - 90 - i * 180 : 60 + 90 + i * 180;
    text(cx, 1004, TIME_NAMES[i], 18, 600, C.faint, 'center', { spacing: 1 });
    items.push({ t: 'run', cx, y: 1040, parts: v ? [{ s: hhmm(v), size: 28, weight: 700, fill: C.ink }, { s: 'Z', size: 16, weight: 400, fill: C.faint, dx: 4 }] : [{ s: '—', size: 28, weight: 700, fill: C.faint }] });
  });
  const src = t.src[d.source];
  if (src) text(E, 1026, src, 20, 400, C.faint, eAlign, { rtl: he });
  return items;
}

export const cardFileName = (d: CardData) => `${d.callsign ?? 'flight'}-${d.from.icao}-${d.to.icao}-${d.date.slice(0, 10)}.png`;
