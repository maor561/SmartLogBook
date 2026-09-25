// Tracked/manual flight → engine input (WP5). Pure, so the completion form's
// live ledger (browser) and closeFlight (server) run the very same code; the
// server recomputes everything and never trusts numbers sent by the browser.
import type { FlightInput } from './engine';
import type { OfpSummary } from './ofp';

export type Times = { out: string | null; off: string | null; on: string | null; in: string | null };
export type Manual = { fuel: number | null; ground: number | null; catering: number | null };

export type Draft = {
  ofp: OfpSummary;
  times: Times;
  fpm: number | null;
  manual: Manual;
  fuelUsdPerKg: number | null;
  rating: number | null;
  positioningNm: number | null;
  diversionNm: number | null;
};

const minutes = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 60000);

// Local time at the origin when the fare is locked: actual OUT, else OFF, else
// the scheduled OUT (ADR-025). Offset in hours from the OFP (may be fractional).
export function localOut(ofp: OfpSummary, t: Times) {
  const at = t.out ?? t.off ?? ofp.sched.out;
  if (!at) return null;
  const d = new Date(Date.parse(at) + (ofp.orig_utc_offset ?? 0) * 3600e3);
  return { month: d.getUTCMonth(), dow: d.getUTCDay(), hour: d.getUTCHours() };
}

// Hebrew messages; empty = the draft can be priced.
export function missing(d: Draft): string[] {
  const m: string[] = [];
  const t = d.times;
  for (const k of ['out', 'off', 'on', 'in'] as const) if (!t[k]) m.push(k.toUpperCase());
  const order = [t.out, t.off, t.on, t.in];
  for (let i = 1; i < 4; i++) if (order[i - 1] && order[i] && Date.parse(order[i]!) < Date.parse(order[i - 1]!)) {
    m.push('סדר הזמנים (OUT ≤ OFF ≤ ON ≤ IN)');
    break;
  }
  if (d.manual.fuel == null || d.manual.ground == null || d.manual.catering == null) m.push('עלויות GSX');
  if (d.fpm == null) m.push('FPM');
  return m;
}

export function toEngineInput(d: Draft): FlightInput | null {
  const t = d.times;
  if (!t.out || !t.off || !t.on || !t.in) return null;
  const o = d.ofp, local = localOut(o, t)!;
  return {
    distanceNm: o.route_distance_nm ?? o.gc_distance_nm ?? 0,
    seats: o.aircraft.seats ?? 0,
    pax: o.weights.pax ?? 0,
    cargoKg: o.weights.freight_kg ?? 0,
    mtowKg: o.weights.mtow_kg ?? 0,
    blockMin: minutes(t.out, t.in),
    airMin: minutes(t.off, t.on),
    fpm: d.fpm,
    out: local,
    fuelUsdPerKg: d.fuelUsdPerKg,
    rating: d.rating,
    manual: d.manual,
    positioningNm: d.positioningNm,
    diversionNm: d.diversionNm,
  };
}

// 'vvvm' etc.: where each of OUT/OFF/ON/IN came from (v = VATSIM, m = manual).
export function timesSource(tracked: Times, final: Times) {
  return (['out', 'off', 'on', 'in'] as const).map((k) => (tracked[k] && tracked[k] === final[k] ? 'v' : 'm')).join('');
}

export function sourceOf(ts: string): 'tracked' | 'partial' | 'manual' {
  return ts === 'vvvv' ? 'tracked' : ts === 'mmmm' ? 'manual' : 'partial';
}
