// Fuel on board (sketch s15, ADR-062): each flight pays for the fuel it burned, not for the fuel
// bought at its gate. Every registration carries what is left in its tanks, at the price it was
// bought, to its next flight. Pure: the completion form (browser) and closeFlight (server) run it.
//
//   in the tanks at PUSHBACK = left from the previous flight + bought at the gate
//   burned                   = in the tanks at PUSHBACK − left at GATE
//   the fuel line            = burned × the average price of the fuel in the tanks
//   carried to the next one  = what was in the tanks, in dollars, minus the fuel line (nothing is lost to rounding)

export const OFF_PLAN = 0.3;          // a warning when the burn is this far from the OFP's plan

// What the previous flight of this registration left. `from` is null when the pilot typed it in
// (the first flight of a registration, or after a flight without the fuel record).
export type FuelStart = { kg: number; usd: number; from: { id: number; label: string } | null };
export type FuelEntry = { startKg: number | null; boughtKg: number | null; boughtUsd: number | null; remainKg: number | null };

// Stored with the flight (flights.fuel_state) and written into the fuel line's calc.
export type FuelState = {
  start_kg: number; start_usd: number; start_from: number | null;
  bought_kg: number; bought_usd: number;
  remain_kg: number; remain_usd: number;
  burned_kg: number; cost_usd: number; avg_usd_per_kg: number;
  plan_kg: number | null;
};
export type FuelResult = { ok: true; state: FuelState; totalKg: number; warning: string | null } | { ok: false; errors: string[] };

const cents = (v: number) => Math.round(v * 100) / 100;
const ok = (v: number | null): v is number => v != null && Number.isFinite(v) && v >= 0;
const nf = (v: number) => Math.round(v).toLocaleString('en-US');

// `fallbackUsdPerKg` prices typed-in starting fuel when nothing was bought at this gate (EIA, else the reference).
export function fuelBurn(start: FuelStart | null, e: FuelEntry, fallbackUsdPerKg: number, planKg: number | null): FuelResult {
  const errors: string[] = [];
  if (!ok(e.boughtKg)) errors.push('דלק שתודלק (ק"ג)');
  if (!ok(e.boughtUsd)) errors.push('דלק שתודלק ($)');
  if (!ok(e.remainKg)) errors.push('דלק שנשאר ב-GATE');
  if (!start && !ok(e.startKg)) errors.push('דלק במכלים לפני התדלוק');
  if (errors.length) return { ok: false, errors };
  const boughtKg = e.boughtKg!, boughtUsd = e.boughtUsd!, remainKg = e.remainKg!;
  if (boughtUsd > 0 && boughtKg === 0) return { ok: false, errors: ['יש סכום לתדלוק בלי כמות'] };

  const price = boughtKg > 0 ? boughtUsd / boughtKg : fallbackUsdPerKg;
  const startKg = start ? start.kg : e.startKg!;
  const startUsd = start ? start.usd : cents(startKg * price);
  const totalKg = startKg + boughtKg, totalUsd = startUsd + boughtUsd;
  if (remainKg > totalKg) return { ok: false, errors: [`נשאר יותר ממה שהיה במכלים (${nf(totalKg)} ק"ג)`] };

  const avg = totalKg > 0 ? totalUsd / totalKg : 0;
  const burnedKg = totalKg - remainKg;
  const cost = remainKg === 0 ? cents(totalUsd) : cents(burnedKg * avg);
  const state: FuelState = {
    start_kg: startKg, start_usd: cents(startUsd), start_from: start?.from?.id ?? null,
    bought_kg: boughtKg, bought_usd: cents(boughtUsd),
    remain_kg: remainKg, remain_usd: cents(totalUsd - cost),
    burned_kg: burnedKg, cost_usd: cost, avg_usd_per_kg: Math.round(avg * 10000) / 10000,
    plan_kg: planKg,
  };
  const off = planKg ? (burnedKg - planKg) / planKg : null;
  const warning = off != null && Math.abs(off) > OFF_PLAN
    ? `נשרפו ${nf(burnedKg)} ק"ג, והתכנון ב-OFP היה ${nf(planKg!)} ק"ג (${off > 0 ? '+' : '−'}${Math.abs(Math.round(off * 100))}%). כדאי לבדוק את הכמויות.`
    : null;
  return { ok: true, state, totalKg, warning };
}

// Planned block burn from the OFP: taxi out + the trip. null for plans stored before ADR-062.
export function plannedBurn(fuel: { taxi_kg: number | null; enroute_burn_kg: number | null } | null | undefined): number | null {
  if (!fuel || fuel.enroute_burn_kg == null) return null;
  return fuel.enroute_burn_kg + (fuel.taxi_kg ?? 0);
}

// The fuel line's calc in the ledger (ADR-006: every number has a source).
export const fuelCalc = (s: FuelState) => ({ ...s, method: 'onboard' });
