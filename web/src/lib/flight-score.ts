// Flight score (sketch s9, ADR-058): how the passengers saw one flight, 0–5,
// from three things that are already measured. Pure. It never touches the
// ledger; money is affected only through the company rating (ADR-037).
import type { LogFlight } from './logbook-filter';

export const ON_TIME_MIN = 15;                           // "on time": within 15 minutes
export const SCORE_WEIGHT = { dep: 0.3, dur: 0.3, land: 0.4 } as const;
// Each part is 5 at `good`, 0 at `bad`, linear in between (like the rating pillars, ADR-036).
export const SCORE_RANGE = { dep: { good: 5, bad: 60 }, dur: { good: 5, bad: 45 }, land: { good: 120, bad: 450 } } as const;

export const lerp5 = (v: number, bad: number, good: number) => 5 * Math.min(1, Math.max(0, (v - bad) / (good - bad)));
const r1 = (x: number) => Math.round(x * 10) / 10;

export type ScorePart = 'dep' | 'dur' | 'land';
export type ScoreInput = {
  depLateMin: number | null;      // OUT after the scheduled OUT (negative: early)
  durOverMin: number | null;      // block time over the planned block (negative: shorter)
  fpm: number | null;             // touchdown rate, sign ignored
};
export type FlightScore = { total: number; parts: Record<ScorePart, number | null>; input: ScoreInput; partial: boolean };

type T4 = { out: string | null; in: string | null };
const mins = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 60000;

export function scoreInput(times: T4, sched: T4, fpm: number | null): ScoreInput {
  const dep = times.out && sched.out ? mins(sched.out, times.out) : null;
  const dur = times.out && times.in && sched.out && sched.in ? mins(times.out, times.in) - mins(sched.out, sched.in) : null;
  return { depLateMin: dep == null ? null : Math.round(dep), durOverMin: dur == null ? null : Math.round(dur), fpm: fpm == null ? null : Math.abs(fpm) };
}

// A part with no data is left out and the other weights are rescaled; null when nothing is known.
export function flightScore(input: ScoreInput): FlightScore | null {
  const R = SCORE_RANGE;
  const parts: Record<ScorePart, number | null> = {
    dep: input.depLateMin == null ? null : lerp5(input.depLateMin, R.dep.bad, R.dep.good),
    dur: input.durOverMin == null ? null : lerp5(input.durOverMin, R.dur.bad, R.dur.good),
    land: input.fpm == null ? null : lerp5(input.fpm, R.land.bad, R.land.good),
  };
  const have = (Object.keys(parts) as ScorePart[]).filter((k) => parts[k] != null);
  if (!have.length) return null;
  const w = have.reduce((s, k) => s + SCORE_WEIGHT[k], 0);
  return { total: r1(have.reduce((s, k) => s + parts[k]! * SCORE_WEIGHT[k], 0) / w), parts, input, partial: have.length < 3 };
}

// Historical flights have no times and no measured landing: no score.
export function scoreOf(f: LogFlight): FlightScore | null {
  if (f.source === 'historical') return null;
  return flightScore(scoreInput(f.times, f.sched, f.fpm));
}

export const depOnTime = (i: ScoreInput) => (i.depLateMin == null ? null : i.depLateMin <= ON_TIME_MIN);
export const durOnTime = (i: ScoreInput) => (i.durOverMin == null ? null : i.durOverMin <= ON_TIME_MIN);

export const scoreTone = (v: number): '' | 'mid' | 'low' => (v >= 4 ? '' : v >= 2.5 ? 'mid' : 'low');
export const scoreVerdict = (v: number) =>
  v >= 4.5 ? 'טיסה מצוינת' : v >= 4 ? 'טיסה טובה' : v >= 3 ? 'טיסה סבירה' : v >= 2 ? 'הנוסעים לא מרוצים' : 'טיסה גרועה';
