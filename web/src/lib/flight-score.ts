// Flight score (sketch s9, ADR-058): how the passengers saw one flight, 0–5,
// from things that are already measured. Pure. It never touches the
// ledger; money is affected only through the company rating (ADR-037).
// A flight whose cabin was tracked has a fourth part, the passenger mood (sketch s14, ADR-061).
import type { LogFlight } from './logbook-filter';
import { lerp5, moodInput, moodOf, type CabinRecord, type Mood, type MoodInput } from './cabin/mood';

export { lerp5 };
export const ON_TIME_MIN = 15;                           // "on time": within 15 minutes
// Without a tracked cabin the three parts keep the weights they always had.
export const SCORE_WEIGHT = { dep: 0.3, dur: 0.3, land: 0.4, mood: 0 } as const;
export const SCORE_WEIGHT_MOOD = { dep: 0.25, dur: 0.25, land: 0.3, mood: 0.2 } as const;
// Each part is 5 at `good`, 0 at `bad`, linear in between (like the rating pillars, ADR-036).
export const SCORE_RANGE = { dep: { good: 5, bad: 60 }, dur: { good: 5, bad: 45 }, land: { good: 120, bad: 450 } } as const;

const r1 = (x: number) => Math.round(x * 10) / 10;

export type ScorePart = 'dep' | 'dur' | 'land' | 'mood';
export type ScoreInput = {
  depLateMin: number | null;      // OUT after the scheduled OUT (negative: early)
  durOverMin: number | null;      // block time over the planned block (negative: shorter)
  fpm: number | null;             // touchdown rate, sign ignored
  mood?: MoodInput | null;        // only when the cabin was tracked; otherwise the score has three parts
};
export type FlightScore = {
  total: number; parts: Record<ScorePart, number | null>; input: ScoreInput; partial: boolean;
  weights: Record<ScorePart, number>; mood: Mood | null;
};

type T4 = { out: string | null; off?: string | null; on?: string | null; in: string | null };
const mins = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 60000;
type CabinParts = Pick<CabinRecord, 'served_share' | 'climb_fpm' | 'descent_fpm'>;

export function scoreInput(times: T4, sched: T4, fpm: number | null, cabin: CabinParts | null = null): ScoreInput {
  const dep = times.out && sched.out ? mins(sched.out, times.out) : null;
  const dur = times.out && times.in && sched.out && sched.in ? mins(times.out, times.in) - mins(sched.out, sched.in) : null;
  return {
    depLateMin: dep == null ? null : Math.round(dep), durOverMin: dur == null ? null : Math.round(dur), fpm: fpm == null ? null : Math.abs(fpm),
    mood: cabin ? moodInput({ out: times.out, off: times.off ?? null, on: times.on ?? null, in: times.in }, cabin) : null,
  };
}

// A part with no data is left out and the other weights are rescaled; null when nothing is known.
export function flightScore(input: ScoreInput): FlightScore | null {
  const R = SCORE_RANGE;
  const mood = input.mood ? moodOf(input.mood) : null;
  const weights = mood ? SCORE_WEIGHT_MOOD : SCORE_WEIGHT;
  const parts: Record<ScorePart, number | null> = {
    dep: input.depLateMin == null ? null : lerp5(input.depLateMin, R.dep.bad, R.dep.good),
    dur: input.durOverMin == null ? null : lerp5(input.durOverMin, R.dur.bad, R.dur.good),
    land: input.fpm == null ? null : lerp5(input.fpm, R.land.bad, R.land.good),
    mood: mood ? mood.value : null,
  };
  const have = (Object.keys(parts) as ScorePart[]).filter((k) => parts[k] != null);
  if (!have.length) return null;
  const w = have.reduce((s, k) => s + weights[k], 0);
  return { total: r1(have.reduce((s, k) => s + parts[k]! * weights[k], 0) / w), parts, input, partial: have.length < (mood ? 4 : 3), weights, mood };
}

// Historical flights have no times and no measured landing: no score.
export function scoreOf(f: LogFlight): FlightScore | null {
  if (f.source === 'historical') return null;
  return flightScore(scoreInput(f.times, f.sched, f.fpm, f.cabin ?? null));
}

export const depOnTime = (i: ScoreInput) => (i.depLateMin == null ? null : i.depLateMin <= ON_TIME_MIN);
export const durOnTime = (i: ScoreInput) => (i.durOverMin == null ? null : i.durOverMin <= ON_TIME_MIN);

export const scoreTone = (v: number): '' | 'mid' | 'low' => (v >= 4 ? '' : v >= 2.5 ? 'mid' : 'low');
export const scoreVerdict = (v: number) =>
  v >= 4.5 ? 'טיסה מצוינת' : v >= 4 ? 'טיסה טובה' : v >= 3 ? 'טיסה סבירה' : v >= 2 ? 'הנוסעים לא מרוצים' : 'טיסה גרועה';
