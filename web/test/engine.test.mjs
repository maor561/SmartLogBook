// WP3 golden tests: the engine must reproduce the approved sketches (s2, s3)
// and the calibration on the user's 10 real flights (ADR-029/034: K=1.51 → 20%).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compute, price, baseFare } from '../src/lib/engine/index.ts';
import { DEFAULTS, withChanges } from '../src/lib/rates/params.ts';

const P = DEFAULTS;
// Sketch 2 was approved with a $0.75/kg fuel reference; ADR-043 moved the default to $1.51.
const P_S2 = withChanges(DEFAULTS, { 'fuel.refUsdPerKg': 0.75 });
const flight = (o = {}) => ({
  distanceNm: 1108, seats: 189, pax: 185, cargoKg: 0, mtowKg: 79000, blockMin: 193, airMin: 171, fpm: -170,
  out: { month: 8, dow: 4, hour: 8 }, fuelUsdPerKg: null, rating: null,
  manual: { fuel: 12000, ground: 2991, catering: 665 }, positioningNm: null, diversionNm: null, ...o,
});
const line = (r, code) => r.lines.find((l) => l.code === code);

// ---- reference: sketch s2 price(), all factors on (docs/mockups/s2-dynamic-pricing.html)
function s2Price(s) {
  const SEASON = [0.85, 0.85, 0.95, 1.05, 0.95, 1.05, 1.20, 1.20, 1.05, 1.00, 0.90, 1.10];
  const DOW = [1.05, 0.95, 0.90, 0.95, 1.08, 1.05, 0.95];
  const hourF = (h) => h < 6 ? 0.90 : h < 10 ? 1.05 : h < 17 ? 1.00 : h < 22 ? 1.05 : 0.95;
  const base = 40 + 1.51 * Math.pow(s.dist, 0.65);
  const lf = s.seats ? s.pax / s.seats : 0;
  const product = (0.85 + 0.30 * lf * lf) * SEASON[s.month] * DOW[s.dow] * hourF(s.hour);
  const clamped = Math.min(1.40, Math.max(0.70, product));
  const sur = Math.min(0.15, Math.max(-0.10, 0.35 * (s.fuel / 0.75 - 1)));
  const fare = Math.round(base * clamped * (1 + sur));
  const cr = (0.8 + 0.05 * Math.pow(s.dist, 0.55)) * (1 + sur);
  return { fare, cargoRev: cr * s.cargo };
}

// ---- reference: sketch s3 engine(), all options on (docs/mockups/s3-cost-engine.html)
function s3Engine(s) {
  const blockH = s.block / 60, airH = Math.max(0, s.block - 22) / 60, m = s.mtow;
  const fa = Math.ceil(s.seats / 50);
  const relief = blockH > 12 ? 2 : blockH > 8 ? 1 : 0;
  const crew = Math.max(blockH, 2) * (200 + 120 + 120 * relief + 40 * fa);
  const maint = airH * (450 + 10.8 * m) + 3 * m;
  const fees = 7 * m + 12 * s.pax;
  const nav = 70 * (s.dist * 1.852 / 100) * Math.sqrt(m / 50);
  const f = Math.abs(s.fpm);
  const pen = (f <= 400 ? 0 : f <= 600 ? 15 : f <= 900 ? 60 : 250) * m;
  const lease = blockH * 10.5 * m;
  return { crew, maint, fees, nav, pen, lease };
}

test('fare and cargo match sketch 2 across the whole grid', () => {
  let n = 0;
  for (const dist of [162, 612, 651, 1938, 4910])
    for (const month of [0, 6, 8, 11]) for (const dow of [0, 2, 4]) for (const hour of [3, 8, 12, 19, 23])
      for (const [pax, seats] of [[40, 189], [150, 189], [189, 189], [300, 396]])
        for (const fuel of [0.55, 0.75, 0.80, 1.20]) {
          const ref = s2Price({ dist, month, dow, hour, pax, seats, fuel, cargo: 2140 });
          const r = compute(P_S2, flight({ distanceNm: dist, seats, pax, cargoKg: 2140, out: { month, dow, hour }, fuelUsdPerKg: fuel }));
          assert.equal(r.fare, ref.fare, `fare ${dist}NM m${month} d${dow} h${hour} ${pax}/${seats} fuel ${fuel}`);
          assert.equal(line(r, 'cargo').amountCents, Math.round(ref.cargoRev * 100));
          n++;
        }
  assert.ok(n > 4000);
});

test('costs match sketch 3 for every aircraft, block and landing', () => {
  const AC = [[72, 23.0], [189, 79.0], [220, 97.0], [290, 254.0], [396, 351.5], [555, 575.0]];
  for (const [seats, mtow] of AC) for (const block of [45, 120, 300, 540, 800]) for (const fpm of [-120, -450, -700, -1100])
    for (const dist of [180, 1100, 5200]) {
      const pax = Math.round(seats * 0.9);
      const ref = s3Engine({ seats, mtow, block, pax, fpm, dist });
      const r = compute(P, flight({ seats, pax, mtowKg: mtow * 1000, blockMin: block, airMin: Math.max(0, block - 22), fpm, distanceNm: dist }));
      const eq = (code, usd) => assert.equal(line(r, code)?.amountCents ?? 0, -Math.round(usd * 100) || 0, `${code} ${seats}/${mtow} ${block}m ${fpm}`);
      eq('crew', ref.crew); eq('maintenance', ref.maint); eq('airport_fees', ref.fees);
      eq('nav_charges', ref.nav); eq('hard_landing', ref.pen); eq('lease', ref.lease);
    }
});

test('calibration: the 10 real flights land on a 20% margin at K=1.51 (ADR-034)', () => {
  const F = JSON.parse(readFileSync(new URL('./fixtures/calibration-10.json', import.meta.url), 'utf8'));
  const run = (params) => {
    let rev = 0, exp = 0;
    for (const f of F) {
      const d = new Date(f.date);
      const r = compute(params, flight({
        distanceNm: f.distanceNm, pax: f.pax, cargoKg: Math.max(0, f.payloadKg - f.pax * 111),
        blockMin: f.airMin + 22, airMin: f.airMin, fpm: f.fpm,
        out: { month: d.getUTCMonth(), dow: d.getUTCDay(), hour: null },   // hour + fuel neutral, as calibrated
        manual: { fuel: f.fuel, ground: f.ground, catering: f.catering },
      }));
      for (const l of r.lines) {
        if (l.amountCents > 0) rev += l.amountCents;
        else exp -= l.amountCents;
      }
    }
    return (rev - exp) / rev;
  };
  const margin = run(P);
  assert.ok(Math.abs(margin - 0.20) < 0.005, `margin ${(margin * 100).toFixed(2)}%`);
  // …and K is where the margin crosses 20%, not a coincidence of rounding.
  assert.ok(run(withChanges(P, { 'fare.k': 1.45 })) < 0.20);
  assert.ok(run(withChanges(P, { 'fare.k': 1.57 })) > 0.20);
});

test('profit is exactly the sum of signed lines (ADR-007)', () => {
  const r = compute(P, flight({ cargoKg: 800 }));
  assert.equal(r.profitCents, r.lines.reduce((s, l) => s + l.amountCents, 0));
  for (const l of r.lines) assert.ok(Number.isInteger(l.amountCents));
  assert.ok(line(r, 'tickets').amountCents > 0 && line(r, 'fuel').amountCents < 0);
  assert.equal(line(r, 'fuel').amountCents, -1200000);
  assert.equal(line(r, 'fuel').source, 'manual');
});

test('clamp, reputation and fuel surcharge (ADR-025, 037)', () => {
  const full = { seats: 189, pax: 189, out: { month: 6, dow: 4, hour: 8 } };   // 1.15 × 1.2 × 1.08 × 1.05 = 1.565
  const r = price(P, flight(full));
  assert.ok(r.clampHit); assert.equal(r.clamped, 1.40);
  const base = baseFare(P, 1108);
  assert.equal(r.fare, Math.round(base * 1.40));
  assert.equal(price(P, flight({ ...full, rating: 5 })).fare, Math.round(base * 1.40 * 1.05));
  assert.equal(price(P, flight({ ...full, rating: 1 })).fare, Math.round(base * 1.40 * 0.95));
  assert.equal(price(P, flight({ ...full, rating: 3 })).fare, r.fare);
  assert.equal(price(P, flight({ ...full, fuelUsdPerKg: 5 })).surcharge, 0.15);
  assert.equal(price(P, flight({ ...full, fuelUsdPerKg: 0.1 })).surcharge, -0.10);
  assert.equal(price(P, flight({ ...full, fuelUsdPerKg: 1.51 })).surcharge, 0);   // ADR-043: today's price is neutral
  assert.equal(price(P, flight({ ...full, fuelUsdPerKg: null })).surcharge, 0);
});

test('relief pilots above 8h and 12h block', () => {
  const crew = (blockMin) => line(compute(P, flight({ blockMin, airMin: blockMin - 22 })), 'crew').calc.relief;
  assert.equal(crew(480), 0); assert.equal(crew(481), 1); assert.equal(crew(721), 2);
});

test('positioning: whole crew × base fare, free under 50 NM (ADR-026)', () => {
  assert.equal(line(compute(P, flight({ positioningNm: 30 })), 'positioning'), undefined);
  const r = compute(P, flight({ positioningNm: 612 }));
  const people = 2 + Math.ceil(189 / 50);
  assert.equal(line(r, 'positioning').amountCents, -Math.round(people * baseFare(P, 612) * 100));
  assert.equal(line(r, 'positioning').calc.people, 6);
});

test('diversion: pax × base fare, bus under 50 NM (ADR-027)', () => {
  assert.equal(line(compute(P, flight({ diversionNm: 20 })), 'diversion').amountCents, -185 * 25 * 100);
  assert.equal(line(compute(P, flight({ diversionNm: 120 })), 'diversion').amountCents, -Math.round(185 * baseFare(P, 120) * 100));
  assert.equal(line(compute(P, flight()), 'diversion'), undefined);
});

test('hard landing tiers (ADR-028)', () => {
  const pen = (fpm) => line(compute(P, flight({ fpm })), 'hard_landing')?.amountCents ?? 0;
  assert.equal(pen(-400), 0); assert.equal(pen(-401), -15 * 79 * 100);
  assert.equal(pen(-600), -15 * 79 * 100); assert.equal(pen(-601), -60 * 79 * 100);
  assert.equal(pen(-901), -250 * 79 * 100); assert.equal(pen(null), 0);
});

test('rates are read from the version, not hard-coded', () => {
  const p2 = withChanges(P, { 'lease.perBlockHourPerMtowT': 13, 'crew.captain': 250 });
  const a = compute(P, flight()), b = compute(p2, flight());
  assert.ok(line(b, 'lease').amountCents < line(a, 'lease').amountCents);
  assert.ok(line(b, 'crew').amountCents < line(a, 'crew').amountCents);
});

test('deterministic: no randomness in the engine (ADR-006)', () => {
  const src = readFileSync(new URL('../src/lib/engine/index.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /Math\.random|Date\.now|new Date/);
  assert.deepEqual(compute(P, flight()), compute(P, flight()));
});

test('EIA response → $/kg, and junk is rejected', async () => {
  const { parseEia } = await import('../src/lib/fuel.ts');
  const r = parseEia({ response: { data: [{ period: '2026-09-18', value: '2.271' }] } });
  assert.equal(r.week, '2026-09-18');
  assert.ok(Math.abs(r.usdPerKg - 0.75) < 0.001);       // ≈ the reference price
  assert.equal(parseEia({ response: { data: [] } }), null);
  assert.equal(parseEia({ response: { data: [{ period: '2026-09-18', value: null }] } }), null);
  assert.equal(parseEia(null), null);
});
