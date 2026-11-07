// WP9 (sketch s15, ADR-062): fuel on board. Each flight pays for the fuel it burned, at the average
// price of the fuel in its tanks; what is left goes, with its value, to the next flight of the registration.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { fuelBurn, fuelCalc, plannedBurn } from '../src/lib/fuel-onboard.ts';
import { FUEL_CHAIN_SQL } from '../src/lib/fuel-sql.ts';
import { compute } from '../src/lib/engine/index.ts';
import { DEFAULTS } from '../src/lib/rates/params.ts';
import { summarizeOfp as appSummary } from '../src/lib/ofp.ts';
import { summarizeOfp as workerSummary } from '../../tracker/src/ofp.js';

const START = { kg: 4200, usd: 6300, from: { id: 9, label: 'ELY2569 LROP–LLBG' } };

test('the example of sketch 15: Tel Aviv–Larnaca burns 2,164 kg at the average price of the tanks', () => {
  const r = fuelBurn(START, { startKg: null, boughtKg: 914, boughtUsd: 1383, remainKg: 2950 }, 1.51, 2100);
  assert.equal(r.ok, true);
  assert.deepEqual(r.state, {
    start_kg: 4200, start_usd: 6300, start_from: 9, bought_kg: 914, bought_usd: 1383,
    remain_kg: 2950, remain_usd: 4431.92, burned_kg: 2164, cost_usd: 3251.08, avg_usd_per_kg: 1.5023, plan_kg: 2100,
  });
  assert.equal(r.totalKg, 5114);
  assert.equal(r.warning, null);                                   // 3% over the plan
  // … and the way back starts from what was left
  const back = fuelBurn({ kg: 2950, usd: 4431.92, from: { id: 10, label: '' } }, { startKg: null, boughtKg: 2832, boughtUsd: 4287, remainKg: 3600 }, 1.51, null);
  assert.equal(back.state.burned_kg, 2182);
  assert.equal(Math.round(back.state.cost_usd), 3290);
});

test('no money is lost or made between flights: the fuel line plus what is carried is what was in the tanks', () => {
  let start = { kg: 3000, usd: 4500, from: { id: 1, label: '' } }, paidTotal = 4500, costTotal = 0;
  const legs = [[5000, 7400, 2600], [0, 0, 900], [8100, 12300.55, 3100], [1200, 1777.77, 0], [6000, 9100, 2500]];
  for (const [kg, usd, remain] of legs) {
    const r = fuelBurn(start, { startKg: null, boughtKg: kg, boughtUsd: usd, remainKg: remain }, 1.5, null);
    assert.equal(r.ok, true);
    assert.equal(Math.round((r.state.cost_usd + r.state.remain_usd) * 100), Math.round((start.usd + usd) * 100));
    paidTotal += usd; costTotal += r.state.cost_usd;
    start = { kg: remain, usd: r.state.remain_usd, from: { id: 1, label: '' } };
  }
  assert.equal(Math.round((paidTotal - costTotal) * 100), Math.round(start.usd * 100));   // what is left in the last tank
});

test('the first flight of a registration: the tanks are typed in and priced at this refuel', () => {
  const r = fuelBurn(null, { startKg: 2000, boughtKg: 4000, boughtUsd: 6000, remainKg: 2500 }, 1.4, null);
  assert.deepEqual([r.state.start_usd, r.state.start_from, r.state.burned_kg, r.state.cost_usd], [3000, null, 3500, 5250]);
  // nothing bought at this gate: the starting fuel takes the fallback price (EIA)
  const none = fuelBurn(null, { startKg: 5000, boughtKg: 0, boughtUsd: 0, remainKg: 3000 }, 1.4, null);
  assert.deepEqual([none.state.start_usd, none.state.cost_usd], [7000, 2800]);
  // everything burned: the whole value is the fuel line
  const empty = fuelBurn(START, { startKg: null, boughtKg: 0, boughtUsd: 0, remainKg: 0 }, 1.4, null);
  assert.deepEqual([empty.state.cost_usd, empty.state.remain_usd], [6300, 0]);
});

test('what the form refuses, and when it warns', () => {
  assert.deepEqual(fuelBurn(START, { startKg: null, boughtKg: null, boughtUsd: 10, remainKg: null }, 1.5, null).errors, ['דלק שתודלק (ק"ג)', 'דלק שנשאר ב-GATE']);
  assert.deepEqual(fuelBurn(null, { startKg: null, boughtKg: 1, boughtUsd: 1, remainKg: 0 }, 1.5, null).errors, ['דלק במכלים לפני התדלוק']);
  assert.match(fuelBurn(START, { startKg: null, boughtKg: 0, boughtUsd: 50, remainKg: 0 }, 1.5, null).errors[0], /בלי כמות/);
  assert.match(fuelBurn(START, { startKg: null, boughtKg: 100, boughtUsd: 150, remainKg: 4400 }, 1.5, null).errors[0], /יותר ממה שהיה.*4,300/);
  assert.equal(fuelBurn(START, { startKg: null, boughtKg: -5, boughtUsd: 0, remainKg: 1 }, 1.5, null).ok, false);
  // 31% over the OFP: a warning, not a refusal
  const over = fuelBurn(START, { startKg: null, boughtKg: 0, boughtUsd: 0, remainKg: 4200 - 2751 }, 1.5, 2100);
  assert.equal(over.ok, true);
  assert.match(over.warning, /2,751 ק"ג.*2,100 ק"ג \(\+31%\)/);
  assert.equal(fuelBurn(START, { startKg: null, boughtKg: 0, boughtUsd: 0, remainKg: 4200 - 1500 }, 1.5, 2100).warning, null);   // −29%: none
});

test('the planned burn comes from the OFP, in both copies of the summary, kg or lbs', () => {
  const raw = (units) => ({
    params: { request_id: '1', time_generated: '1790000000', units }, origin: { icao_code: 'LROP' }, destination: { icao_code: 'LLBG' },
    fuel: { taxi: '227', enroute_burn: '6295', plan_ramp: '10144', plan_landing: '3622' },
  });
  assert.deepEqual(appSummary(raw('kgs')).fuel, { taxi_kg: 227, enroute_burn_kg: 6295, plan_ramp_kg: 10144, plan_landing_kg: 3622 });
  assert.deepEqual(appSummary(raw('lbs')).fuel, workerSummary(raw('lbs')).fuel);
  assert.equal(appSummary(raw('lbs')).fuel.enroute_burn_kg, 2855);
  assert.equal(plannedBurn(appSummary(raw('kgs')).fuel), 6522);
  assert.equal(plannedBurn(undefined), null);                     // a plan stored before ADR-062
});

test('the fuel line of the ledger is what was burned, and carries its calculation', () => {
  const s = fuelBurn(START, { startKg: null, boughtKg: 914, boughtUsd: 1383, remainKg: 2950 }, 1.51, null).state;
  const r = compute(DEFAULTS, {
    distanceNm: 219, seats: 189, pax: 185, cargoKg: 0, mtowKg: 79000, blockMin: 59, airMin: 45, fpm: -150,
    out: { month: 8, dow: 1, hour: 10 }, fuelUsdPerKg: 1.51, rating: null,
    manual: { fuel: s.cost_usd, ground: 2355, catering: 294 }, positioningNm: 0, diversionNm: null, fuelCalc: fuelCalc(s),
  });
  const line = r.lines.find((l) => l.code === 'fuel');
  assert.equal(line.amountCents, -325108);
  assert.equal(line.calc.method, 'onboard');
  assert.equal(line.calc.burned_kg, 2164);
});

test('migration 006, and the chain: the latest closed flight of the registration, or nothing', async () => {
  const MIG = new URL('../db/migrations/', import.meta.url);
  const db = new PGlite();
  for (const f of readdirSync(MIG).filter((x) => x.endsWith('.sql')).sort()) await db.exec(readFileSync(new URL(f, MIG), 'utf8'));
  await db.query('INSERT INTO rate_sets (note, params) VALUES ($1, $2)', ['v1', readFileSync(new URL('../db/rate-set-v1.json', import.meta.url), 'utf8')]);
  const add = (reg, at, state, status = 'closed') => db.query(
    `INSERT INTO flights (status, source, origin_icao, dest_planned_icao, rate_set_id, registration, callsign, in_at, fuel_state)
     VALUES ($1, 'tracked', 'LLBG', 'LCLK', 1, $2, 'ELY1', $3, $4::jsonb) RETURNING id`, [status, reg, at, state ? JSON.stringify(state) : null]);
  const chain = async (reg) => (await db.query(FUEL_CHAIN_SQL, [reg])).rows[0] ?? null;

  assert.equal(await chain('4X-EKA'), null);                        // never flown
  await add('4X-EKA', '2026-10-01T10:00:00Z', { remain_kg: 4200, remain_usd: 6300 });
  await add('4X-EKB', '2026-10-05T10:00:00Z', { remain_kg: 999, remain_usd: 1 });
  const last = await add('4X-EKA', '2026-10-03T10:00:00Z', { remain_kg: 2950, remain_usd: 4431.92 });
  await add('4X-EKA', '2026-09-01T10:00:00Z', { remain_kg: 1, remain_usd: 1 });             // older
  const c = await chain('4X-EKA');
  assert.equal(c.id, last.rows[0].id);
  assert.deepEqual(c.fuel_state, { remain_kg: 2950, remain_usd: 4431.92 });
  // a newer flight closed without the record (from before ADR-062) breaks the chain
  await add('4X-EKA', '2026-10-04T10:00:00Z', null);
  assert.equal((await chain('4X-EKA')).fuel_state, null);
  // the drafts table takes the kg bought
  await db.query(`INSERT INTO flight_drafts (ofp_id, fuel, fuel_kg) VALUES ('x', 1383, 914)`);
  assert.equal(Number((await db.query(`SELECT fuel_kg FROM flight_drafts`)).rows[0].fuel_kg), 914);
});

// ---------- ADR-063: the fare follows the GSX price; the flights closed before it are priced again once
import { FARE_FUEL_TODO_SQL, RATE_WITH_CAP_SQL } from '../src/lib/fare-fuel-sql.ts';

test('migration 007: a new rate version with the 30% cap, once; and which flights are priced again', async () => {
  const MIG = new URL('../db/migrations/', import.meta.url);
  const files = readdirSync(MIG).filter((x) => x.endsWith('.sql')).sort();
  const db = new PGlite();
  for (const f of files.filter((x) => x < '007')) await db.exec(readFileSync(new URL(f, MIG), 'utf8'));
  const old = JSON.parse(readFileSync(new URL('../db/rate-set-v1.json', import.meta.url), 'utf8'));
  old.fuel.maxPct = 15;
  await db.query('INSERT INTO rate_sets (note, params) VALUES ($1, $2)', ['v', JSON.stringify(old)]);
  await db.query(`INSERT INTO settings (simbrief_id, vatsim_cid, current_rate_set_id) VALUES ('X', 1, 1)`);
  const mig = readFileSync(new URL('007_fare_fuel.sql', MIG), 'utf8');
  await db.exec(mig);
  await db.exec(mig);                                                    // a second run changes nothing
  const sets = (await db.query(`SELECT id, (params->'fuel'->>'maxPct')::int AS cap FROM rate_sets ORDER BY id`)).rows;
  assert.deepEqual(sets, [{ id: 1, cap: 15 }, { id: 2, cap: 30 }]);
  assert.equal((await db.query('SELECT current_rate_set_id AS c FROM settings')).rows[0].c, 2);
  const cap = (await db.query(RATE_WITH_CAP_SQL)).rows[0];
  assert.equal(cap.id, 2);
  const { fuel: f2, ...rest2 } = cap.params, { fuel: f1, ...rest1 } = old;
  assert.deepEqual(rest2, rest1);                                       // only the cap changed
  assert.deepEqual({ ...f2, maxPct: 15 }, f1);

  const flight = async (fuel, ticketsCalc, extra = '') => {
    const id = (await db.query(`INSERT INTO flights (status, source, origin_icao, dest_planned_icao, rate_set_id, ofp_doc, fuel_state, in_at)
      VALUES ('closed', 'tracked', 'SBRF', 'SBSV', 1, '{}'::jsonb, $1::jsonb, now()) RETURNING id`, [fuel ? JSON.stringify(fuel) : null])).rows[0].id;
    await db.query(`INSERT INTO ledger_lines (flight_id, code, amount_cents, source, calc) VALUES ($1, 'tickets', 100, 'auto', $2::jsonb)`, [id, JSON.stringify(ticketsCalc)]);
    if (extra) await db.query(extra.replace('$ID', id));
    return id;
  };
  const a = await flight({ cost_usd: 1 }, { fare: 137 });                                       // to do
  await flight({ cost_usd: 1 }, { fare: 159, fuelSource: 'gsx' });                             // already priced by the new rule
  await flight(null, { fare: 120 });                                                             // no fuel on board
  await flight({ cost_usd: 1 }, { fare: 99 }, `INSERT INTO ledger_lines (flight_id, code, amount_cents, source, calc) VALUES ($ID, 'hard_landing', -5, 'auto', '{}')`);
  assert.deepEqual((await db.query(FARE_FUEL_TODO_SQL)).rows.map((r) => r.id), [a]);
});

// ---------- ADR-064: the new fare curve, and every closed flight priced again once
import { CURVE_SINCE_SQL, CURVE_TODO_SQL, CURVE_VERSION_SQL, withCurve } from '../src/lib/fare-curve-sql.ts';

test('migration 008: a version with the new curve for each version closed flights used, then the new current one', async () => {
  const MIG = new URL('../db/migrations/', import.meta.url);
  const files = readdirSync(MIG).filter((x) => x.endsWith('.sql')).sort();
  const db = new PGlite();
  for (const f of files.filter((x) => x < '008')) await db.exec(readFileSync(new URL(f, MIG), 'utf8'));
  const base = JSON.parse(readFileSync(new URL('../db/rate-set-v1.json', import.meta.url), 'utf8'));
  const old = { ...base, fare: { ...base.fare, f0: 40, k: 1.51 }, loadFactor: { a: 0.85, b: 0.3 } };
  const v2 = { ...old, maintenance: { ...old.maintenance, perAirHourPerMtowT: 10.8 } };
  await db.query('INSERT INTO rate_sets (note, params) VALUES ($1, $2), ($3, $4)', ['v1', JSON.stringify(v2), 'v2', JSON.stringify(old)]);
  await db.query(`INSERT INTO settings (simbrief_id, vatsim_cid, current_rate_set_id) VALUES ('X', 1, 2)`);
  const fl = async (rs, extra = '') => {
    const id = (await db.query(`INSERT INTO flights (status, source, origin_icao, dest_planned_icao, rate_set_id, ofp_doc, closed_at, in_at)
      VALUES ('closed', 'tracked', 'LLBG', 'LCLK', $1, '{}'::jsonb, now() - interval '1 day', now() - interval '1 day') RETURNING id`, [rs])).rows[0].id;
    if (extra) await db.query(extra.replace('$ID', id));
    return id;
  };
  const a = await fl(1), b = await fl(2), c = await fl(2);
  await fl(2, `INSERT INTO ledger_lines (flight_id, code, amount_cents, source, calc) VALUES ($ID, 'hard_landing', -5, 'auto', '{}')`);
  const mig = readFileSync(new URL('008_fare_curve.sql', MIG), 'utf8');
  await db.exec(mig);
  const sets = (await db.query(`SELECT id, note, params FROM rate_sets ORDER BY id`)).rows;
  assert.equal(sets.length, 5);                                          // 2 old, 2 with the curve, 1 new current
  assert.equal((await db.query('SELECT current_rate_set_id AS c FROM settings')).rows[0].c, 5);
  assert.match(sets[4].note, /\(ADR-064\)$/);
  assert.deepEqual(sets[2].params, withCurve(v2));                       // each keeps everything else
  assert.deepEqual(sets[3].params, withCurve(old));
  assert.deepEqual(sets[4].params, withCurve(old));
  // flights still on an old curve, apart from the one with a hard landing
  const since = (await db.query(CURVE_SINCE_SQL)).rows[0].created_at;
  assert.deepEqual((await db.query(CURVE_TODO_SQL, [since])).rows.map((r) => r.id), [a, b, c]);
  // each finds the version written for its own one
  assert.equal((await db.query(CURVE_VERSION_SQL, [JSON.stringify(withCurve(v2))])).rows[0].id, 3);
  assert.equal((await db.query(CURVE_VERSION_SQL, [JSON.stringify(withCurve(old))])).rows[0].id, 4);
  // once moved, a flight is done; a flight closed after the curve is never touched
  await db.query('UPDATE flights SET rate_set_id = 3 WHERE id = $1', [a]);
  await db.query(`INSERT INTO flights (status, source, origin_icao, dest_planned_icao, rate_set_id, ofp_doc, closed_at) VALUES ('closed', 'tracked', 'LLBG', 'LCLK', 2, '{}'::jsonb, now() + interval '1 hour')`);
  assert.deepEqual((await db.query(CURVE_TODO_SQL, [since])).rows.map((r) => r.id), [b, c]);
});
