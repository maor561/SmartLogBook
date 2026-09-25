// Company rating (ADR-036), ranks and milestones (ADR-038). Pure.
import type { LogFlight } from './logbook-filter';

// ---------- rating: 4 pillars over the last 30 closed flights, 0–5 each

const lerp = (v: number, bad: number, good: number) => {
  const t = (v - bad) / (good - bad);
  return 5 * Math.min(1, Math.max(0, t));
};
const r1 = (x: number) => Math.round(x * 10) / 10;

export type Pillar = { key: 'safety' | 'punctuality' | 'profit' | 'efficiency'; name: string; score: number; why: string };
export type Rating = { overall: number; pillars: Pillar[]; flights: number } | null;

export const OTP_MINUTES = 15;           // ADR-035: OUT within 15 min of scheduled OUT
export const RATING_WINDOW = 30;
export const RATING_MIN_FLIGHTS = 5;

export function onTime(f: LogFlight): boolean | null {
  if (!f.times.out || !f.sched.out) return null;
  return (Date.parse(f.times.out) - Date.parse(f.sched.out)) / 60000 <= OTP_MINUTES;
}

const revenue = (f: LogFlight) => f.lines.filter((l) => l.cents > 0).reduce((s, l) => s + l.cents, 0);

// `flights` newest first. Only flights closed in the new system count (historical ones have no times or ledger detail).
export function companyRating(flights: LogFlight[]): Rating {
  const win = flights.filter((f) => f.source !== 'historical').slice(0, RATING_WINDOW);
  if (win.length < RATING_MIN_FLIGHTS) return null;

  const fpms = win.filter((f) => f.fpm != null).map((f) => Math.abs(f.fpm!));
  const avgFpm = fpms.length ? fpms.reduce((a, b) => a + b, 0) / fpms.length : 0;
  const hardRate = fpms.length ? fpms.filter((x) => x > 400).length / fpms.length : 0;
  const safety = 0.7 * lerp(avgFpm, 450, 120) + 0.3 * lerp(hardRate, 0.2, 0);

  const otpFlags = win.map(onTime).filter((x): x is boolean => x != null);
  const otp = otpFlags.length ? otpFlags.filter(Boolean).length / otpFlags.length : null;
  const punctuality = otp == null ? 2.5 : lerp(otp, 0.4, 0.9);

  const rev = win.reduce((s, f) => s + revenue(f), 0);
  const net = win.reduce((s, f) => s + f.profitCents, 0);
  const margin = rev > 0 ? net / rev : 0;
  const profit = lerp(margin, 0, 0.3);

  const lfs = win.filter((f) => f.seats && f.pax != null).map((f) => f.pax! / f.seats!);
  const lf = lfs.length ? lfs.reduce((a, b) => a + b, 0) / lfs.length : 0;
  const extraRate = win.filter((f) => f.lines.some((l) => l.code === 'positioning' || l.code === 'diversion')).length / win.length;
  const efficiency = 0.7 * lerp(lf, 0.5, 0.9) + 0.3 * lerp(extraRate, 0.25, 0);

  const pillars: Pillar[] = [
    { key: 'safety', name: 'בטיחות', score: r1(safety), why: `FPM ממוצע ${Math.round(avgFpm)} · ${Math.round(hardRate * 100)}% נחיתות קשות` },
    { key: 'punctuality', name: 'דיוק', score: r1(punctuality), why: otp == null ? 'אין עדיין זמני יציאה' : `${Math.round(otp * 100)}% יציאות בזמן` },
    { key: 'profit', name: 'רווחיות', score: r1(profit), why: `שוליים ${Math.round(margin * 100)}% (יעד 20%)` },
    { key: 'efficiency', name: 'יעילות', score: r1(efficiency), why: `תפוסה ${Math.round(lf * 100)}% · ${Math.round(extraRate * 100)}% עם הקפצה או הסטה` },
  ];
  return { overall: r1(pillars.reduce((s, p) => s + p.score, 0) / 4), pillars, flights: win.length };
}

// ---------- ranks by total block hours (historical flights count by planned air time)

export const RANKS: [number, string][] = [
  [0, 'טייס משנה'], [100, 'טייס משנה בכיר'], [300, 'קברניט'], [750, 'קברניט בכיר'], [1500, 'קברניט בוחן'], [3000, 'טייס ראשי'],
];

export function rankFor(hours: number) {
  let i = 0;
  while (i + 1 < RANKS.length && hours >= RANKS[i + 1][0]) i++;
  const next = RANKS[i + 1];
  return { name: RANKS[i][1], hours, next: next ? { name: next[1], at: next[0], left: next[0] - hours } : null };
}

// ---------- milestones: cumulative, the next one in each category opens by itself

export type MilestoneCat = 'block_hours' | 'flights' | 'pax' | 'distance' | 'profit' | 'airports' | 'soft_streak';
export const MILESTONES: { cat: MilestoneCat; name: string; unit: string; steps: number[] }[] = [
  { cat: 'block_hours', name: 'שעות בלוק', unit: 'h', steps: [10, 25, 50, 100, 250, 500, 1000, 2500, 5000] },
  { cat: 'flights', name: 'טיסות', unit: '', steps: [10, 25, 50, 100, 250, 500, 1000] },
  { cat: 'pax', name: 'נוסעים', unit: '', steps: [1e3, 5e3, 1e4, 2.5e4, 5e4, 1e5, 2.5e5] },
  { cat: 'distance', name: 'מרחק', unit: 'NM', steps: [1e4, 2.5e4, 5e4, 1e5, 2.5e5, 5e5] },
  { cat: 'profit', name: 'רווח מצטבר', unit: '$', steps: [1e5, 2.5e5, 5e5, 1e6, 2.5e6, 5e6, 1e7] },
  { cat: 'airports', name: 'שדות שונים', unit: '', steps: [10, 25, 50, 100, 200] },
  { cat: 'soft_streak', name: 'רצף נחיתות רכות', unit: '', steps: [5, 10, 25, 50] },
];
export const SOFT_FPM = 200;

export type Crossing = { cat: MilestoneCat; threshold: number; flightId: number; at: string };

// Walks the flights oldest → newest and reports every threshold crossed, with the flight that crossed it.
export function milestoneCrossings(flights: LogFlight[]): { crossings: Crossing[]; totals: Record<MilestoneCat, number>; best: Record<MilestoneCat, number> } {
  const chron = [...flights].sort((a, b) => Date.parse(a.date) - Date.parse(b.date) || a.id - b.id);
  const tot: Record<MilestoneCat, number> = { block_hours: 0, flights: 0, pax: 0, distance: 0, profit: 0, airports: 0, soft_streak: 0 };
  const seen = new Set<string>();
  const best: Record<MilestoneCat, number> = { ...tot };
  const crossings: Crossing[] = [];
  for (const f of chron) {
    tot.block_hours += (f.blockMin ?? 0) / 60;
    tot.flights += 1;
    tot.pax += f.pax ?? 0;
    tot.distance += f.distanceNm ?? 0;
    tot.profit += f.profitCents / 100;
    seen.add(f.origin); seen.add(f.dest); tot.airports = seen.size;
    if (f.fpm != null) tot.soft_streak = Math.abs(f.fpm) <= SOFT_FPM ? tot.soft_streak + 1 : 0;
    for (const m of MILESTONES) {
      const v = tot[m.cat];
      for (const s of m.steps) if (v >= s && best[m.cat] < s) crossings.push({ cat: m.cat, threshold: s, flightId: f.id, at: f.date });
      best[m.cat] = Math.max(best[m.cat], v);
    }
  }
  return { crossings, totals: tot, best };
}

// Next = first step above the best ever reached (a broken soft-landing streak
// doesn't re-offer a step already achieved); progress shows the current value.
export function nextMilestones(totals: Record<MilestoneCat, number>, best: Record<MilestoneCat, number>) {
  return MILESTONES.map((m) => {
    const next = m.steps.find((s) => s > best[m.cat]) ?? null;
    return { ...m, current: totals[m.cat], next };
  });
}
