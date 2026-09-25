// Analysis screen (sketch s5, ADR-035). Pure: flights + period in, sections out.
// Money totals by line come from SQL (SUM … GROUP BY code) and are passed in;
// everything per-flight uses each flight's own ledger sum, never a re-price.
import type { LogFlight } from './logbook-filter';
import { onTime } from './rating';

export type PeriodKind = 'm' | 'q' | 'y' | 'all' | 'custom';
export type Range = { kind: PeriodKind; from: Date | null; to: Date | null; label: string };

const HE_MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

// `anchor` = YYYY-MM-DD inside the period (for m/q/y); custom uses from/to.
export function rangeOf(kind: PeriodKind, anchor: string, from?: string, to?: string): Range {
  const a = new Date(`${anchor}T00:00:00Z`);
  const y = a.getUTCFullYear(), m = a.getUTCMonth();
  if (kind === 'm') return { kind, from: new Date(Date.UTC(y, m, 1)), to: new Date(Date.UTC(y, m + 1, 1)), label: `${HE_MONTHS[m]} ${y}` };
  if (kind === 'q') { const q = Math.floor(m / 3); return { kind, from: new Date(Date.UTC(y, q * 3, 1)), to: new Date(Date.UTC(y, q * 3 + 3, 1)), label: `רבעון ${q + 1} · ${y}` }; }
  if (kind === 'y') return { kind, from: new Date(Date.UTC(y, 0, 1)), to: new Date(Date.UTC(y + 1, 0, 1)), label: String(y) };
  if (kind === 'custom' && from && to) {
    const f = new Date(`${from}T00:00:00Z`), t = new Date(Date.parse(`${to}T00:00:00Z`) + 86400e3);
    return { kind, from: f, to: t, label: `${from.split('-').reverse().join('.')} – ${to.split('-').reverse().join('.')}` };
  }
  return { kind: 'all', from: null, to: null, label: 'כל הזמנים' };
}

// The period just before (for "vs previous" deltas); null for 'all'.
export function previousRange(r: Range): Range | null {
  if (!r.from || !r.to) return null;
  if (r.kind === 'm' || r.kind === 'q' || r.kind === 'y') {
    const d = new Date(r.from.getTime() - 86400e3).toISOString().slice(0, 10);
    return rangeOf(r.kind, d);
  }
  const len = r.to.getTime() - r.from.getTime();
  return { kind: 'custom', from: new Date(r.from.getTime() - len), to: r.from, label: 'התקופה הקודמת' };
}

export function shift(r: Range, dir: -1 | 1): string | null {
  if (!r.from || !r.to || r.kind === 'custom') return null;
  const d = dir < 0 ? new Date(r.from.getTime() - 86400e3) : r.to;
  return d.toISOString().slice(0, 10);
}

export const inRange = (f: LogFlight, r: Range) => {
  const t = Date.parse(f.date);
  return (!r.from || t >= r.from.getTime()) && (!r.to || t < r.to.getTime());
};

const sum = <T,>(xs: T[], fn: (x: T) => number) => xs.reduce((s, x) => s + fn(x), 0);
const lineSum = (f: LogFlight, code: string) => sum(f.lines.filter((l) => l.code === code), (l) => l.cents);
const revenueOf = (f: LogFlight) => sum(f.lines.filter((l) => l.cents > 0), (l) => l.cents);

// ---------- 1 · KPIs

export function kpis(list: LogFlight[]) {
  const live = list.filter((f) => f.source !== 'historical');
  const rev = sum(list, revenueOf), net = sum(list, (f) => f.profitCents);
  const seats = live.filter((f) => f.seats && f.pax != null);
  const otp = live.map(onTime).filter((x): x is boolean => x != null);
  const fpms = list.filter((f) => f.fpm != null).map((f) => Math.abs(f.fpm!));
  return {
    flights: list.length,
    blockMin: sum(list, (f) => f.blockMin ?? 0),
    netCents: net,
    margin: rev > 0 ? sum(live, (f) => f.profitCents) / sum(live, revenueOf) : null,   // historical flights have no revenue detail
    pax: sum(list, (f) => f.pax ?? 0),
    lf: seats.length ? sum(seats, (f) => f.pax!) / sum(seats, (f) => f.seats!) : null,
    otp: otp.length ? otp.filter(Boolean).length / otp.length : null,
    avgFpm: fpms.length ? sum(fpms, (x) => x) / fpms.length : null,
  };
}
export type Kpis = ReturnType<typeof kpis>;

// ---------- 2 · P&L unit metrics (RASM / CASM use seat-NM of flights with revenue detail)

export function units(list: LogFlight[]) {
  const live = list.filter((f) => f.source !== 'historical' && f.seats && f.distanceNm);
  const seatNm = sum(live, (f) => f.seats! * f.distanceNm!);
  const rev = sum(live, revenueOf), net = sum(live, (f) => f.profitCents);
  const bh = sum(list, (f) => f.blockMin ?? 0) / 60;
  return {
    rasmCents: seatNm ? rev / seatNm : null,
    casmCents: seatNm ? (rev - net) / seatNm : null,
    perBlockHourCents: bh ? sum(list, (f) => f.profitCents) / bh : null,
    perFlightCents: list.length ? sum(list, (f) => f.profitCents) / list.length : null,
  };
}

// ---------- 3 · trend buckets (weeks for a month, months otherwise), empty buckets = 0

export function trend(list: LogFlight[], r: Range) {
  const byMonth = r.kind !== 'm';
  const start = r.from ?? (list.length ? new Date(Math.min(...list.map((f) => Date.parse(f.date)))) : new Date());
  const end = r.to ?? new Date(Math.max(Date.now(), ...list.map((f) => Date.parse(f.date) + 1)));
  const buckets: { label: string; from: number; to: number; netCents: number; revCents: number; flights: number }[] = [];
  if (byMonth) {
    let d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    while (d < end) {
      const n = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
      buckets.push({ label: `${HE_MONTHS[d.getUTCMonth()].slice(0, 3)}׳ ${String(d.getUTCFullYear()).slice(2)}`, from: d.getTime(), to: n.getTime(), netCents: 0, revCents: 0, flights: 0 });
      d = n;
    }
  } else {
    for (let i = 0; start.getTime() + i * 7 * 86400e3 < end.getTime(); i++) {
      const from = start.getTime() + i * 7 * 86400e3;
      buckets.push({ label: `שבוע ${i + 1}`, from, to: Math.min(from + 7 * 86400e3, end.getTime()), netCents: 0, revCents: 0, flights: 0 });
    }
  }
  for (const f of list) {
    const t = Date.parse(f.date), b = buckets.find((x) => t >= x.from && t < x.to);
    if (b) { b.netCents += f.profitCents; b.revCents += revenueOf(f); b.flights++; }
  }
  return buckets.slice(-24);
}

// ---------- 4 · ground costs (GSX) by destination

export function groundByAirport(list: LogFlight[]) {
  const by: Record<string, { n: number; ground: number; catering: number; fuel: number; pax: number; nm: number }> = {};
  for (const f of list) {
    if (!f.lines.some((l) => l.source === 'manual')) continue;
    const a = (by[f.dest] ??= { n: 0, ground: 0, catering: 0, fuel: 0, pax: 0, nm: 0 });
    a.n++; a.ground -= lineSum(f, 'ground_handling'); a.catering -= lineSum(f, 'catering'); a.fuel -= lineSum(f, 'fuel');
    a.pax += f.pax ?? 0; a.nm += f.distanceNm ?? 0;
  }
  const rows = Object.entries(by);
  const n = sum(rows, ([, a]) => a.n);
  const avg = n ? sum(rows, ([, a]) => a.ground) / n : 0;
  return rows.map(([icao, a]) => ({
    icao, n: a.n, groundAvgCents: a.ground / a.n, vsAvg: avg ? a.ground / a.n / avg - 1 : 0,
    cateringPerPaxCents: a.pax ? a.catering / a.pax : null, fuelPerNmCents: a.nm ? a.fuel / a.nm : null,
  })).sort((x, y) => y.groundAvgCents - x.groundAvgCents);
}

// ---------- 5 · routes by profit per block hour

export function routes(list: LogFlight[]) {
  const by: Record<string, { o: string; d: string; n: number; net: number; min: number; pax: number; seats: number; rev: number }> = {};
  for (const f of list) {
    const a = (by[`${f.origin}>${f.dest}`] ??= { o: f.origin, d: f.dest, n: 0, net: 0, min: 0, pax: 0, seats: 0, rev: 0 });
    a.n++; a.net += f.profitCents; a.min += f.blockMin ?? 0; a.pax += f.pax ?? 0; a.seats += f.seats ?? 0; a.rev += revenueOf(f);
  }
  return Object.values(by).map((a) => ({
    o: a.o, d: a.d, n: a.n, lf: a.seats ? a.pax / a.seats : null,
    perHourCents: a.min ? a.net / (a.min / 60) : null, margin: a.rev ? a.net / a.rev : null, netCents: a.net,
  })).sort((x, y) => (y.perHourCents ?? -Infinity) - (x.perHourCents ?? -Infinity));
}

// ---------- 6 · punctuality and operations (VATSIM times)

export function ops(list: LogFlight[]) {
  const timed = list.filter((f) => f.times.out && f.sched.out);
  const delay = (f: LogFlight) => (Date.parse(f.times.out!) - Date.parse(f.sched.out!)) / 60000;
  const blockDiff = list.filter((f) => f.times.out && f.times.in && f.sched.out && f.sched.in)
    .map((f) => (Date.parse(f.times.in!) - Date.parse(f.times.out!) - (Date.parse(f.sched.in!) - Date.parse(f.sched.out!))) / 60000);
  const taxi: Record<string, number[]> = {};
  for (const f of list) if (f.times.out && f.times.off) (taxi[f.origin] ??= []).push((Date.parse(f.times.off) - Date.parse(f.times.out)) / 60000);
  return {
    otp: timed.length ? timed.filter((f) => delay(f) <= 15).length / timed.length : null,
    late: timed.filter((f) => delay(f) > 15).length,
    early: timed.filter((f) => delay(f) < -5).length,
    blockVsPlanMin: blockDiff.length ? sum(blockDiff, (x) => x) / blockDiff.length : null,
    taxiOut: Object.entries(taxi).map(([icao, xs]) => ({ icao, min: sum(xs, (x) => x) / xs.length, n: xs.length })).sort((a, b) => b.min - a.min).slice(0, 3),
  };
}

// ---------- 7 · landings

export const FPM_BUCKETS = [100, 200, 300, 400, 600, Infinity];
export const FPM_LABELS = ['≤100', '101–200', '201–300', '301–400', '401–600', '>600'];

export function landings(list: LogFlight[], newestFirstAll: LogFlight[]) {
  const withFpm = list.filter((f) => f.fpm != null);
  const counts = FPM_BUCKETS.map(() => 0);
  for (const f of withFpm) counts[FPM_BUCKETS.findIndex((b) => Math.abs(f.fpm!) <= b)]++;
  const best = withFpm.reduce<LogFlight | null>((a, f) => (!a || Math.abs(f.fpm!) < Math.abs(a.fpm!) ? f : a), null);
  let streak = 0;
  for (const f of newestFirstAll) { if (f.fpm == null) continue; if (Math.abs(f.fpm) <= 200) streak++; else break; }
  return {
    counts, best: best ? { fpm: best.fpm!, id: best.id } : null,
    hard: withFpm.filter((f) => Math.abs(f.fpm!) > 400).length,
    penaltyCents: -sum(list, (f) => lineSum(f, 'hard_landing')),
    softStreak: streak,
  };
}

// ---------- 8 · aircraft by registration

export function aircraft(list: LogFlight[]) {
  const by: Record<string, { reg: string; type: string | null; n: number; min: number; net: number }> = {};
  for (const f of list) {
    const k = f.reg ?? f.aircraft ?? '—';
    const a = (by[k] ??= { reg: k, type: f.aircraft, n: 0, min: 0, net: 0 });
    a.n++; a.min += f.blockMin ?? 0; a.net += f.profitCents;
  }
  return Object.values(by).map((a) => ({ ...a, perHourCents: a.min ? a.net / (a.min / 60) : null })).sort((x, y) => y.n - x.n);
}

// ---------- 9 · network and data quality

export function network(list: LogFlight[], all: LogFlight[], r: Range) {
  const before = new Set(all.filter((f) => r.from && Date.parse(f.date) < r.from.getTime()).flatMap((f) => [f.origin, f.dest]));
  const here = new Set(list.flatMap((f) => [f.origin, f.dest]));
  const withLine = (code: string) => list.filter((f) => f.lines.some((l) => l.code === code));
  const pos = withLine('positioning'), div = withLine('diversion');
  return {
    positioning: { n: pos.length, cents: -sum(pos, (f) => lineSum(f, 'positioning')) },
    diversions: { n: div.length, cents: -sum(div, (f) => lineSum(f, 'diversion')) },
    airports: here.size,
    newAirports: r.from ? [...here].filter((a) => !before.has(a)).length : null,
    tracked: list.filter((f) => f.source === 'tracked').length,
    partialOrManual: list.filter((f) => f.source === 'partial' || f.source === 'manual').length,
    historical: list.filter((f) => f.source === 'historical').length,
  };
}
