// WP14 (sketch s12, ADR-060): periodic checks, repair requests after a hard landing,
// grounding, and the migration that splits the maintenance rate.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { compute, checkDue } from '../src/lib/engine/index.ts';
import { DEFAULTS, validate, withChanges } from '../src/lib/rates/params.ts';
import { settle, nextChecks, GROUND_DAYS } from '../src/lib/maintenance.ts';
import * as SQL from '../src/lib/maintenance-sql.ts';

const MIG = new URL('../db/migrations/', import.meta.url);
const migrations = () => readdirSync(MIG).filter((x) => x.endsWith('.sql')).sort();
const P = DEFAULTS;
// the single hourly rate that sketches 2 and 3 were approved with
const OLD = withChanges(DEFAULTS, { 'maintenance.perAirHourPerMtowT': 10.8, 'maintenance.lightEveryHours': 0, 'maintenance.mediumEveryHours': 0 });
const flight = (o = {}) => ({
  distanceNm: 1108, seats: 189, pax: 185, cargoKg: 0, mtowKg: 79000, blockMin: 193, airMin: 171, fpm: -170,
  out: { month: 8, dow: 4, hour: 8 }, fuelUsdPerKg: null, rating: null,
  manual: { fuel: 12000, ground: 2991, catering: 665 }, positioningNm: null, diversionNm: null, ...o,
});
const line = (r, code) => r.lines.find((l) => l.code === code);

// ---------- engine

test('a check is due on the flight that crosses the interval; the medium one includes the light one', () => {
  assert.equal(checkDue(P, 96.4, 171), null);                                   // 96.4 + 2.85 = 99.25
  assert.deepEqual(checkDue(P, 98, 171), { kind: 'light', atHours: 100, perMtowT: 190 });
  assert.deepEqual(checkDue(P, 598, 171), { kind: 'medium', atHours: 600, perMtowT: 1330 });
  assert.deepEqual(checkDue(P, 1198, 171), { kind: 'medium', atHours: 1200, perMtowT: 1330 });
  assert.equal(checkDue(P, 100, 60), null);                                     // already past 100: the next is at 200
  assert.equal(checkDue(P, null, 171), null);                                   // unknown airframe hours
  assert.equal(checkDue(OLD, 98, 171), null);                                   // a rate version without checks
});

test('the check is a ledger line of its own: $190 per MTOW ton, on that flight only', () => {
  const before = compute(P, flight({ airframeHoursBefore: 50 })), crossing = compute(P, flight({ airframeHoursBefore: 98 }));
  assert.equal(line(before, 'maintenance_check'), undefined);
  assert.equal(line(crossing, 'maintenance_check').amountCents, -190 * 79 * 100);
  assert.equal(line(crossing, 'maintenance_check').calc.kind, 'light');
  assert.equal(crossing.profitCents, before.profitCents - 190 * 79 * 100);
  assert.equal(line(compute(P, flight({ airframeHoursBefore: 598 })), 'maintenance_check').amountCents, -1330 * 79 * 100);
  assert.equal(line(compute(P, flight()), 'maintenance_check'), undefined);     // no registration: no check
});

test('the split costs the same: 600 air hours under the old rate and under the new one', () => {
  for (const mtowKg of [23000, 79000, 351500]) {
    let oldC = 0, newC = 0, hours = 0;
    for (let i = 0; i < 200; i++) {                                             // 200 flights of 3 air hours
      const f = flight({ mtowKg, airMin: 180, blockMin: 200, airframeHoursBefore: hours });
      oldC += line(compute(OLD, f), 'maintenance').amountCents;
      const r = compute(P, f);
      newC += line(r, 'maintenance').amountCents + (line(r, 'maintenance_check')?.amountCents ?? 0);
      hours += 3;
    }
    assert.equal(hours, 600);
    assert.ok(Math.abs(oldC - newC) <= 200, `${mtowKg}: ${oldC} vs ${newC}`);   // cents of rounding over 200 flights
  }
});

test('the default rates are valid, and the medium interval must be a multiple of the light one', () => {
  assert.deepEqual(validate(P), []);
  assert.ok(validate(withChanges(P, { 'maintenance.mediumEveryHours': 250 })).length);
});

test('a hard landing becomes a repair request when there is a registration to ground', () => {
  const r = compute(P, flight({ fpm: -655 }));
  assert.equal(line(r, 'hard_landing').amountCents, -60 * 79 * 100);
  const s = settle(r, true);
  assert.equal(s.lines.some((l) => l.code === 'hard_landing'), false);
  assert.deepEqual([s.repair.cents, s.repair.tier, s.repair.fpm], [474000, 'amm', -655]);
  assert.equal(s.profitCents, r.profitCents + 474000);
  assert.equal(s.profitCents, s.lines.reduce((a, l) => a + l.amountCents, 0));
  // no registration: nothing to ground, the cost stays a line (as before ADR-060)
  assert.equal(settle(r, false).repair, null);
  assert.equal(settle(r, false).profitCents, r.profitCents);
  assert.equal(settle(compute(P, flight()), true).repair, null);                // a soft landing
});

test('how far the next checks are', () => {
  const [light, medium] = nextChecks(P, 96.4, 79);
  assert.deepEqual([light.kind, light.leftHours, light.cents], ['light', 3.6, 1501000]);
  assert.deepEqual([medium.kind, medium.leftHours, medium.cents], ['medium', 503.6, 10507000]);
  assert.deepEqual(nextChecks(OLD, 96.4, 79), []);
});

// ---------- database

const OLD_PARAMS = () => { const j = JSON.parse(readFileSync(new URL('../db/rate-set-v1.json', import.meta.url), 'utf8')); j.maintenance = { perAirHour: 450, perAirHourPerMtowT: 10.8, perCyclePerMtowT: 3 }; return j; };

test('migration 004 on the live shape: a new rate version with the split, older flights untouched', async () => {
  const db = new PGlite();
  for (const f of migrations().filter((x) => x < '004')) await db.exec(readFileSync(new URL(f, MIG), 'utf8'));
  await db.query('INSERT INTO rate_sets (note, params) VALUES ($1, $2)', ['v1', JSON.stringify(OLD_PARAMS())]);
  await db.query(`INSERT INTO settings (simbrief_id, vatsim_cid, current_rate_set_id) VALUES ('X', 1, 1)`);
  await db.query(`INSERT INTO flights (status, source, origin_icao, dest_planned_icao, rate_set_id, registration) VALUES ('closed', 'tracked', 'LLBG', 'LGAV', 1, 'N1')`);

  await db.exec(readFileSync(new URL('004_fleet.sql', MIG), 'utf8'));

  const { rows: sets } = await db.query('SELECT id, params FROM rate_sets ORDER BY id');
  assert.equal(sets.length, 2);
  assert.equal(sets[0].params.maintenance.perAirHourPerMtowT, 10.8);            // versions are immutable (ADR-021)
  assert.deepEqual(sets[1].params.maintenance, { perAirHour: 450, perAirHourPerMtowT: 7, perCyclePerMtowT: 3, lightEveryHours: 100, lightPerMtowT: 190, mediumEveryHours: 600, mediumPerMtowT: 1330 });
  assert.deepEqual(sets[1].params.fare, sets[0].params.fare);                   // nothing else changed
  assert.deepEqual(validate(sets[1].params), []);
  assert.equal((await db.query('SELECT current_rate_set_id AS c FROM settings')).rows[0].c, 2);
  assert.equal((await db.query('SELECT rate_set_id AS r, airframe_hours_before AS h FROM flights')).rows[0].r, 1);
  // running the statement again would not create a third version
  const again = readFileSync(new URL('004_fleet.sql', MIG), 'utf8').split('-- A new rate version')[1];
  await db.exec('-- A new rate version' + again);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM rate_sets')).rows[0].n, 2);
});

test('migration 004 on an empty database does nothing to the rates (the seed already has the split)', async () => {
  const db = new PGlite();
  for (const f of migrations()) await db.exec(readFileSync(new URL(f, MIG), 'utf8'));
  assert.equal((await db.query('SELECT count(*)::int AS n FROM rate_sets')).rows[0].n, 0);
});

async function fresh() {
  const db = new PGlite();
  for (const f of migrations()) await db.exec(readFileSync(new URL(f, MIG), 'utf8'));
  await db.query('INSERT INTO rate_sets (params) VALUES ($1)', [JSON.stringify(DEFAULTS)]);
  const add = async (reg, off, on, status = 'closed', fpm = -150) => (await db.query(
    `INSERT INTO flights (status, source, origin_icao, dest_planned_icao, rate_set_id, registration, aircraft_type, mtow_kg, callsign, out_at, off_at, on_at, in_at, closed_at, fpm)
     VALUES ($1, $2, 'LLBG', 'LGAV', $3, $4, 'B738', 79000, 'ELY1', $5, $5, $6, $6, $6, $7) RETURNING id`,
    [status, status === 'historical' ? 'historical' : 'tracked', status === 'historical' ? null : 1, reg, off, on, fpm])).rows[0].id;
  return { db, add };
}

test('airframe hours: closed flights of that registration only, historical ones not counted', async () => {
  const { db, add } = await fresh();
  await add('N1', '2026-10-01T10:00Z', '2026-10-01T13:00Z');                     // 3.0 h
  await add('N1', '2026-10-02T10:00Z', '2026-10-02T11:30Z');                     // 1.5 h
  await add('N2', '2026-10-02T10:00Z', '2026-10-02T12:00Z');
  await add('N1', '2026-06-01T10:00Z', '2026-06-01T20:00Z', 'historical');
  assert.equal((await db.query(SQL.AIRFRAME_HOURS_SQL, ['N1'])).rows[0].hours, 4.5);
  assert.equal((await db.query(SQL.AIRFRAME_HOURS_SQL, ['N9'])).rows[0].hours, 0);
  const { rows } = await db.query(SQL.FLEET_SQL, [400]);
  assert.deepEqual(rows.map((r) => [r.registration, r.air_hours, r.flights]), [['N2', 2, 1], ['N1', 4.5, 2]]);   // the aircraft flown last comes first
});

test('a repair grounds the aircraft; paying writes the line into the flight that caused it, once', async () => {
  const { db, add } = await fresh();
  const id = await add('N1', '2026-10-01T10:00Z', '2026-10-01T13:00Z', 'closed', -655);
  await db.query(SQL.INSERT_REPAIR_SQL, [id, 'N1', 'amm', -655, 474000, JSON.stringify({ tier: 'amm', fpm: -655 }), GROUND_DAYS]);
  await db.query(SQL.INSERT_REPAIR_SQL, [id, 'N1', 'amm', -655, 474000, '{}', GROUND_DAYS]);     // one request per flight
  const open = (await db.query(SQL.OPEN_REPAIR_SQL, ['N1'])).rows;
  assert.equal(open.length, 1);
  assert.equal(Number(open[0].amount_cents), 474000);
  assert.equal(Math.round((new Date(open[0].due_at) - new Date(open[0].created_at)) / 864e5), 4);
  assert.equal((await db.query(SQL.OPEN_REPAIRS_COUNT_SQL)).rows[0].n, 1);
  assert.equal((await db.query(SQL.OPEN_REPAIR_SQL, ['N2'])).rows.length, 0);    // other aircraft are not grounded
  assert.equal((await db.query('SELECT count(*)::int AS n FROM ledger_lines')).rows[0].n, 0);   // not in the ledger yet

  assert.equal((await db.query(SQL.PAY_REPAIR_SQL, [open[0].id])).rows.length, 1);
  assert.equal((await db.query(SQL.PAY_REPAIR_SQL, [open[0].id])).rows.length, 0);              // paying twice does nothing
  const { rows: lines } = await db.query('SELECT flight_id, code, amount_cents FROM ledger_lines');
  assert.deepEqual(lines.map((l) => [l.flight_id, l.code, Number(l.amount_cents)]), [[id, 'hard_landing', -474000]]);
  assert.equal((await db.query(SQL.OPEN_REPAIR_SQL, ['N1'])).rows.length, 0);                   // released
  assert.equal((await db.query('SELECT paid_how FROM repairs')).rows[0].paid_how, 'manual');
});

test('unpaid for 4 days: released and charged by itself, dated at the due time, once', async () => {
  const { db, add } = await fresh();
  const id = await add('N1', '2026-10-01T10:00Z', '2026-10-01T13:00Z', 'closed', -950);
  await db.query(SQL.INSERT_REPAIR_SQL, [id, 'N1', 'structural', -950, 1975000, '{}', GROUND_DAYS]);
  const due = new Date((await db.query('SELECT due_at FROM repairs')).rows[0].due_at);
  const at = (ms) => new Date(due.getTime() + ms).toISOString();

  assert.equal((await db.query(SQL.SETTLE_OVERDUE_SQL, [at(-60_000)])).rows.length, 0);          // a minute early: still grounded
  assert.equal((await db.query(SQL.OPEN_REPAIR_SQL, ['N1'])).rows.length, 1);
  assert.equal((await db.query(SQL.SETTLE_OVERDUE_SQL, [at(1000)])).rows.length, 1);
  assert.equal((await db.query(SQL.SETTLE_OVERDUE_SQL, [at(5000)])).rows.length, 0);
  const r = (await db.query('SELECT paid_at, paid_how FROM repairs')).rows[0];
  assert.equal(r.paid_how, 'auto');
  assert.equal(new Date(r.paid_at).getTime(), due.getTime());
  assert.equal(Number((await db.query('SELECT sum(amount_cents) AS s FROM ledger_lines')).rows[0].s), -1975000);
  assert.equal((await db.query(SQL.OPEN_REPAIR_SQL, ['N1'])).rows.length, 0);
});

test('editing keeps the request in step, deleting the flight removes it, and the history lists both kinds', async () => {
  const { db, add } = await fresh();
  const a = await add('N1', '2026-10-01T10:00Z', '2026-10-01T13:00Z', 'closed', -655);
  const b = await add('N1', '2026-10-02T10:00Z', '2026-10-02T13:00Z');
  await db.query(`INSERT INTO ledger_lines (flight_id, code, amount_cents, source, calc) VALUES ($1, 'maintenance_check', -1501000, 'auto', '{"kind":"light","atHours":100}')`, [b]);
  await db.query(SQL.INSERT_REPAIR_SQL, [a, 'N1', 'amm', -655, 474000, '{}', GROUND_DAYS]);
  const [rep] = (await db.query(SQL.REPAIR_OF_FLIGHT_SQL, [a])).rows;
  await db.query(SQL.UPDATE_REPAIR_SQL, [rep.id, 118500, 'visual', -450, '{}']);
  assert.deepEqual((await db.query('SELECT amount_cents::int AS c, tier FROM repairs')).rows[0], { c: 118500, tier: 'visual' });

  const { rows: h } = await db.query(SQL.HISTORY_SQL);
  assert.deepEqual(h.map((x) => [x.what, x.kind, x.state, Number(x.amount_cents)]).sort(), [['check', 'light', 'closing', 1501000], ['repair', 'visual', 'open', 118500]]);

  await db.query('DELETE FROM flights WHERE id = $1', [a]);                      // ON DELETE CASCADE
  assert.equal((await db.query('SELECT count(*)::int AS n FROM repairs')).rows[0].n, 0);
  await db.query(SQL.INSERT_REPAIR_SQL, [b, 'N1', 'amm', -655, 474000, '{}', GROUND_DAYS]);
  await db.query(SQL.DELETE_REPAIR_SQL, [(await db.query(SQL.REPAIR_OF_FLIGHT_SQL, [b])).rows[0].id]);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM repairs')).rows[0].n, 0);
});

// The closing statement lives in a server action (a tagged template). Run its very text on
// Postgres, with a value for each ${...}, so a mistake in the SQL is caught here and not on a real flight.
test('the closing statement: flight, ledger lines and the repair request in one go', async () => {
  const src = readFileSync(new URL('../src/app/(app)/flight-actions.ts', import.meta.url), 'utf8');
  const tpl = /const rows = await db\(\)`([\s\S]*?)`;/.exec(src)[1];
  const lines = [{ code: 'tickets', amount_cents: 3_000_000, source: 'auto', calc: {} }, { code: 'maintenance_check', amount_cents: -1_501_000, source: 'auto', calc: { kind: 'light' } }];
  const value = (e, hard) => {
    if (e.includes('JSON.stringify(lines)')) return JSON.stringify(lines);
    if (e.includes('JSON.stringify(repair')) return JSON.stringify({ tier: 'amm' });
    if (e.includes('JSON.stringify(o)')) return '{}';
    if (e === 'repair != null') return hard;
    if (e.startsWith('repair?.tier')) return hard ? 'amm' : '';
    if (e.startsWith('repair?.fpm')) return hard ? -655 : null;
    if (e.startsWith('repair?.cents')) return hard ? 474000 : 0;
    if (e === 'GROUND_DAYS') return GROUND_DAYS;
    if (e.startsWith('o.aircraft.reg')) return 'N1';
    if (e === 'o.id') return hard ? 'ofp-hard' : 'ofp-soft';
    if (e === 'sourceOf(ts)') return 'tracked';
    if (e === 'ts') return 'vvvv';
    if (/icao/.test(e)) return 'LLBG';
    if (e === 'times.out' || e === 'times.off' || e.startsWith('o.sched') || e === 'o.generated_at') return '2026-10-02T10:00:00Z';
    if (e === 'times.on' || e === 'times.in') return '2026-10-02T13:00:00Z';
    if (e === 'o.callsign' || e === 'o.aircraft.type') return 'B738';
    if (e === 'o.alternate' || e === 'f.rating') return null;
    if (e === 'fpm') return hard ? -655 : -150;
    if (e.startsWith('draft.airframeHoursBefore')) return 98.25;
    if (e.startsWith('cabin ?')) return hard ? null : JSON.stringify({ tier: 'meal', served_share: 0.875 });     // ADR-061
    return 1;                                                                    // every other value is a number
  };
  const run = async (db, hard) => {
    const params = [];
    const text = tpl.replace(/\$\{((?:[^{}]|\{[^{}]*\})*)\}/g, (_, e) => { params.push(value(e.trim(), hard)); return `$${params.length}`; });
    return (await db.query(text, params)).rows;
  };
  const { db } = await fresh();
  assert.equal((await run(db, false)).length, 2);                                // one row per ledger line
  assert.equal((await db.query('SELECT count(*)::int AS n FROM repairs')).rows[0].n, 0);
  assert.equal((await run(db, true)).length, 2);
  assert.deepEqual((await db.query(`SELECT ofp_id, cabin FROM flights ORDER BY id`)).rows,
    [{ ofp_id: 'ofp-soft', cabin: { tier: 'meal', served_share: 0.875 } }, { ofp_id: 'ofp-hard', cabin: null }]);
  const rep = (await db.query('SELECT r.registration, r.tier, r.amount_cents::int AS c, r.due_at, r.created_at, f.ofp_id, f.airframe_hours_before::float8 AS h FROM repairs r JOIN flights f ON f.id = r.flight_id')).rows;
  assert.equal(rep.length, 1);
  assert.deepEqual([rep[0].registration, rep[0].tier, rep[0].c, rep[0].ofp_id, rep[0].h], ['N1', 'amm', 474000, 'ofp-hard', 98.25]);
  assert.equal(Math.round((new Date(rep[0].due_at) - new Date(rep[0].created_at)) / 864e5), GROUND_DAYS);
  assert.equal((await run(db, true)).length, 0);                                 // the same OFP again: nothing is written
  assert.equal((await db.query('SELECT count(*)::int AS n FROM repairs')).rows[0].n, 1);
  assert.equal((await db.query(`SELECT count(*)::int AS n FROM ledger_lines WHERE code = 'hard_landing'`)).rows[0].n, 0);
});
