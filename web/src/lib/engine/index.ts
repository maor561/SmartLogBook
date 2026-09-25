// The calculation engine (ADR-006, WP3). Pure: no DB, no network, no clock,
// no randomness. Input = one flight + one rate version; output = ledger lines
// with signed cents (ADR-007) and a `calc` trail for "how did we get here".
import type { RateParams } from '../rates/params';

export type LedgerCode =
  | 'tickets' | 'cargo' | 'fuel' | 'ground_handling' | 'catering' | 'crew' | 'maintenance'
  | 'airport_fees' | 'nav_charges' | 'lease' | 'hard_landing' | 'positioning' | 'diversion';

export type LedgerLine = {
  code: LedgerCode;
  amountCents: number;               // revenue > 0, cost < 0
  source: 'simbrief' | 'manual' | 'auto';
  calc: Record<string, unknown>;
};

export type FlightInput = {
  distanceNm: number;                // OFP route distance: fare, cargo, nav
  seats: number;                     // OFP max_passengers
  pax: number;
  cargoKg: number;                   // weights.freight_added (ADR-039)
  mtowKg: number;
  blockMin: number;                  // OUT→IN
  airMin: number;                    // OFF→ON
  fpm: number | null;                // entered at completion; null = not yet
  // Local time at the origin at OUT (ADR-025). null hour = neutral (historical data).
  out: { month: number; dow: number; hour: number | null };
  fuelUsdPerKg: number | null;       // EIA at OUT; null = neutral surcharge
  rating: number | null;             // company rating before this flight; null = "building" = neutral (ADR-037)
  manual: { fuel: number | null; ground: number | null; catering: number | null };   // USD from GSX
  positioningNm: number | null;      // crew location → origin; null/0 = crew already here (ADR-026)
  diversionNm: number | null;        // actual → planned destination; null = no diversion (ADR-027)
};

export type EngineResult = { lines: LedgerLine[]; fare: number; profitCents: number };

// Half a cent rounds away from zero, so a cost and the same revenue mirror exactly.
const cents = (usd: number) => Math.sign(usd) * Math.round(Math.abs(usd) * 100);
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const r4 = (x: number) => Math.round(x * 1e4) / 1e4;

export function baseFare(p: RateParams, nm: number): number {
  return p.fare.f0 + p.fare.k * Math.pow(nm, p.fare.exp);
}

export function hourMultiplier(p: RateParams, hour: number): number {
  const h = p.hour;
  return hour < 6 ? h.night : hour < 10 ? h.am : hour < 17 ? h.day : hour < 22 ? h.pm : h.late;
}

export function fuelSurcharge(p: RateParams, usdPerKg: number | null): number {
  if (usdPerKg == null) return 0;
  const f = p.fuel;
  return clamp(f.sensitivity * (usdPerKg / f.refUsdPerKg - 1), f.minPct / 100, f.maxPct / 100);
}

export function crewSize(p: RateParams, seats: number, blockMin: number) {
  const bh = blockMin / 60;
  const relief = bh > p.crew.relief4AboveHours ? 2 : bh > p.crew.relief3AboveHours ? 1 : 0;
  const attendants = Math.ceil(seats / p.crew.seatsPerAttendant);
  return { pilots: 2 + relief, relief, attendants };
}

// ---------- revenue (ADR-025, 034, 037, 039)

export function price(p: RateParams, f: FlightInput) {
  const base = baseFare(p, f.distanceNm);
  const lf = f.seats > 0 ? f.pax / f.seats : 0;
  const m = {
    loadFactor: p.loadFactor.a + p.loadFactor.b * lf * lf,
    season: p.season[f.out.month],
    dow: p.dow[f.out.dow],
    hour: f.out.hour == null ? 1 : hourMultiplier(p, f.out.hour),
  };
  const product = m.loadFactor * m.season * m.dow * m.hour;
  const clamped = clamp(product, p.clamp.min, p.clamp.max);
  const rating = f.rating == null ? null : clamp(f.rating, 1, 5);
  const reputation = rating == null ? 0 : (p.reputation.maxPct / 100) * (rating - 3) / 2;
  const surcharge = fuelSurcharge(p, f.fuelUsdPerKg);
  const fare = Math.round(base * clamped * (1 + reputation) * (1 + surcharge));
  const cargoRate = (p.cargo.a + p.cargo.b * Math.pow(f.distanceNm, p.cargo.c)) * (1 + surcharge);
  return {
    fare, base, lf, multipliers: m, product, clamped, clampHit: clamped !== product,
    rating, reputation, fuelUsdPerKg: f.fuelUsdPerKg, surcharge, cargoRate,
  };
}

// ---------- costs (ADR-026, 027, 028)

export function compute(p: RateParams, f: FlightInput): EngineResult {
  const lines: LedgerLine[] = [];
  const add = (code: LedgerCode, usd: number, source: LedgerLine['source'], calc: Record<string, unknown>) =>
    lines.push({ code, amountCents: cents(usd), source, calc });

  const pr = price(p, f);
  const mtowT = f.mtowKg / 1000;
  const bh = f.blockMin / 60, ah = f.airMin / 60;

  add('tickets', pr.fare * f.pax, 'auto', {
    distanceNm: f.distanceNm, base: r4(pr.base), lf: r4(pr.lf), multipliers: pr.multipliers,
    product: r4(pr.product), clamped: r4(pr.clamped), clampHit: pr.clampHit,
    rating: pr.rating, reputation: r4(pr.reputation), fuelUsdPerKg: pr.fuelUsdPerKg, surcharge: r4(pr.surcharge),
    fare: pr.fare, pax: f.pax,
  });
  if (f.cargoKg > 0) add('cargo', pr.cargoRate * f.cargoKg, 'auto', { kg: f.cargoKg, ratePerKg: r4(pr.cargoRate), surcharge: r4(pr.surcharge) });

  // Manual GSX costs (ADR-011): only once entered.
  if (f.manual.fuel != null) add('fuel', -f.manual.fuel, 'manual', {});
  if (f.manual.ground != null) add('ground_handling', -f.manual.ground, 'manual', {});
  if (f.manual.catering != null) add('catering', -f.manual.catering, 'manual', {});

  const c = p.crew, crew = crewSize(p, f.seats, f.blockMin);
  const payH = Math.max(bh, c.minHours);
  const crewHourly = c.captain + c.firstOfficer + c.relief * crew.relief + c.attendant * crew.attendants;
  add('crew', -payH * crewHourly, 'auto', { payHours: r4(payH), hourly: crewHourly, relief: crew.relief, attendants: crew.attendants });

  const mx = p.maintenance;
  const mxHourly = mx.perAirHour + mx.perAirHourPerMtowT * mtowT;
  add('maintenance', -(ah * mxHourly + mx.perCyclePerMtowT * mtowT), 'auto', { airHours: r4(ah), hourly: r4(mxHourly), cycle: r4(mx.perCyclePerMtowT * mtowT) });

  add('airport_fees', -(p.fees.landingPerMtowT * mtowT + p.fees.airportPerPax * f.pax), 'auto', { mtowT, pax: f.pax });

  const km = f.distanceNm * 1.852;
  add('nav_charges', -(p.nav.per100km * (km / 100) * Math.sqrt(mtowT / p.nav.refMtowT)), 'auto', { km: r4(km), mtowT });

  add('lease', -(bh * p.lease.perBlockHourPerMtowT * mtowT), 'auto', { blockHours: r4(bh), mtowT });

  if (f.fpm != null) {
    const h = p.hardLanding, abs = Math.abs(f.fpm);
    const [tier, perT] = abs <= h.freeUpToFpm ? ['none', 0] : abs <= h.visualUpToFpm ? ['visual', h.visualPerMtowT]
      : abs <= h.ammUpToFpm ? ['amm', h.ammPerMtowT] : ['structural', h.structuralPerMtowT];
    if (perT > 0) add('hard_landing', -(perT * mtowT), 'auto', { fpm: f.fpm, tier, perMtowT: perT, mtowT });
  }

  if (f.positioningNm != null && f.positioningNm > 0) {
    const people = 2 + crew.attendants;
    const free = f.positioningNm < p.positioning.freeUnderNm;
    const fareEach = free ? 0 : baseFare(p, f.positioningNm);
    if (!free) add('positioning', -(people * fareEach), 'auto', { nm: f.positioningNm, people, fareEach: r4(fareEach) });
  }

  if (f.diversionNm != null) {
    const bus = f.diversionNm < p.diversion.busUnderNm;
    const each = bus ? p.diversion.busPerPax : baseFare(p, f.diversionNm);
    add('diversion', -(f.pax * each), 'auto', { nm: f.diversionNm, pax: f.pax, each: r4(each), bus });
  }

  return { lines, fare: pr.fare, profitCents: lines.reduce((s, l) => s + l.amountCents, 0) };
}
