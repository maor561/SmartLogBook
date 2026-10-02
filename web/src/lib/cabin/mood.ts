// Passenger mood (sketch s14, ADR-061): 0–5, from three things the pilot controls. Pure.
// It is one part of the flight score, and through it of the company rating; never of the ledger.
import { MIN, anchorsOf, plannedAirMin, servedShare, simulate, tierOf, type AirDoc, type T4, type Tier } from './sim';

export const lerp5 = (v: number, bad: number, good: number) => 5 * Math.min(1, Math.max(0, (v - bad) / (good - bad)));
const r1 = (x: number) => Math.round(x * 10) / 10;

export const MOOD_WEIGHT = { ground: 0.3, service: 0.4, comfort: 0.3 } as const;
// Each part is 5 at `good`, 0 at `bad`, linear in between.
// Climb and descent are minute averages from the tracker. On the recorded real flight (DLH314) a
// normal climb reached 4,163 ft/min, so the climb limit sits above that; a descent is felt sooner.
export const MOOD_RANGE = {
  ground: { good: 25, bad: 60 },                 // minutes on the ground with the passengers on board (taxi out + taxi in)
  service: { good: 1, bad: 0.5 },                // share of the passengers served before the descent
  climb: { good: 4500, bad: 7000 },              // ft/min
  descent: { good: 3000, bad: 5000 },
} as const;

export type MoodPart = keyof typeof MOOD_WEIGHT;
export type MoodInput = { groundMin: number | null; servedShare: number | null; climbFpm: number | null; descentFpm: number | null };
export type Mood = { total: number; value: number; parts: Record<MoodPart, number | null>; input: MoodInput };

// A part with no data is left out and the other weights are rescaled; null when nothing is known.
export function moodOf(i: MoodInput): Mood | null {
  const R = MOOD_RANGE;
  const rates = [
    i.climbFpm == null ? null : lerp5(i.climbFpm, R.climb.bad, R.climb.good),
    i.descentFpm == null ? null : lerp5(i.descentFpm, R.descent.bad, R.descent.good),
  ].filter((x): x is number => x != null);
  const parts: Record<MoodPart, number | null> = {
    ground: i.groundMin == null ? null : lerp5(i.groundMin, R.ground.bad, R.ground.good),
    service: i.servedShare == null ? null : lerp5(i.servedShare, R.service.bad, R.service.good),
    comfort: rates.length ? Math.min(...rates) : null,       // the worse of the two
  };
  const have = (Object.keys(parts) as MoodPart[]).filter((k) => parts[k] != null);
  if (!have.length) return null;
  const w = have.reduce((s, k) => s + MOOD_WEIGHT[k], 0);
  const value = have.reduce((s, k) => s + parts[k]! * MOOD_WEIGHT[k], 0) / w;
  return { total: r1(value), value, parts, input: i };
}

export function groundMinutes(t: T4): number | null {
  if (!t.out || !t.off || !t.on || !t.in) return null;
  return Math.round((Date.parse(t.off) - Date.parse(t.out) + Date.parse(t.in) - Date.parse(t.on)) / MIN);
}

// What is stored with a closed flight (flights.cabin): the measured air part and what it meant for the service.
export type CabinRecord = {
  tier: Tier;
  served_share: number | null;
  climb_fpm: number | null; descent_fpm: number | null;
  belt_off_at: string | null; toc_at: string | null; tod_at: string | null; belt_on_at: string | null;
  top_alt_ft: number | null;
};

// Built once, when the flight closes, from what the tracker measured. Runs the same simulation the
// screen showed (same seed, same anchors), so the stored share is the one the pilot saw.
export function cabinRecord(o: { id: string; pax: number; sched: T4 }, times: T4, air: AirDoc): CabinRecord {
  const tier = tierOf(plannedAirMin(o.sched));
  const a = anchorsOf(o.sched, times, air, Date.parse(times.in ?? times.on ?? times.off ?? times.out ?? '1970-01-01T00:00:00Z'));
  const share = servedShare(simulate({ seed: o.id, pax: o.pax, tier, night: false, a }));
  return {
    tier, served_share: share == null ? null : Math.round(share * 1000) / 1000,
    climb_fpm: air.max_climb_fpm, descent_fpm: air.max_descent_fpm,
    belt_off_at: air.belt_off_at, toc_at: air.toc_at, tod_at: air.tod_at, belt_on_at: air.belt_on_at, top_alt_ft: air.top_alt_ft,
  };
}

export const moodInput = (times: T4, c: Pick<CabinRecord, 'served_share' | 'climb_fpm' | 'descent_fpm'>): MoodInput =>
  ({ groundMin: groundMinutes(times), servedShare: c.served_share, climbFpm: c.climb_fpm, descentFpm: c.descent_fpm });
