// WP16 (sketch s14, ADR-061): the cabin in flight. The seat map, the anchors taken from the real
// flight, the simulation, the announcements, the passenger mood and its place in the flight score.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { AISLE_Y, LAV, SEATS, SEAT_H, SEAT_W } from '../src/lib/cabin/map.ts';
import { MIN, SEC, TIER_NEEDS, anchorsOf, cabinFits, carts, isNight, phaseLabel, progress, servedShare, simulate, stateAt, tierOf } from '../src/lib/cabin/sim.ts';
import { announcements } from '../src/lib/cabin/pa.ts';
import { cabinRecord, groundMinutes, moodOf } from '../src/lib/cabin/mood.ts';
import { flightScore, scoreInput, scoreOf } from '../src/lib/flight-score.ts';
import { companyRating } from '../src/lib/rating.ts';

const T = Date.UTC(2026, 9, 2, 18, 0);                       // PUSHBACK
const iso = (min) => new Date(T + min * MIN).toISOString();
// Planned: taxi 14, 191 minutes in the air, taxi in 7. Flown exactly so.
const SCHED = { out: iso(0), off: iso(14), on: iso(205), in: iso(212) };
const TIMES = { out: iso(0), off: iso(14), on: iso(205), in: iso(212) };
const AIR = { belt_off_at: iso(20), toc_at: iso(35), tod_at: iso(179), belt_on_at: iso(196), max_climb_fpm: 2900, max_descent_fpm: 1800, top_alt_ft: 32000 };
const A = anchorsOf(SCHED, TIMES, AIR, T + 300 * MIN);
const sim = (o = {}) => simulate({ seed: '188328361', pax: 120, tier: 'full', night: false, a: A, ...o });

test('the seat map: 189 seats, exactly the ones in the approved picture', () => {
  const doc = JSON.parse(readFileSync(new URL('../../docs/mockups/cabin-737-800-189.json', import.meta.url), 'utf8'));
  assert.equal(SEATS.length, 189);
  assert.deepEqual(SEATS, doc.seats);
  assert.deepEqual([SEAT_W, SEAT_H, AISLE_Y], [...doc.seat, doc.aisleY]);
  assert.equal(SEATS.filter((s) => s.row === 21).map((s) => s.letter).join(''), 'CBA');
});

test('the service plan follows the planned air time', () => {
  assert.equal(tierOf(30), 'none');
  assert.equal(tierOf(48), 'drinks');                        // the recorded DLH314: 48 minutes in the air
  assert.equal(tierOf(80), 'meal');
  assert.equal(tierOf(191), 'full');
  assert.ok(TIER_NEEDS.drinks < TIER_NEEDS.meal && TIER_NEEDS.meal < TIER_NEEDS.full);
});

test('anchors: what was measured stays, what has not happened is never in the past', () => {
  assert.deepEqual(A, { out: T, off: T + 14 * MIN, beltOff: T + 20 * MIN, toc: T + 35 * MIN, tod: T + 179 * MIN, beltOn: T + 196 * MIN, on: T + 205 * MIN, in: T + 212 * MIN });
  // taxiing for 30 minutes although 14 were planned: takeoff is still ahead
  const late = anchorsOf(SCHED, { out: iso(0), off: null, on: null, in: null }, null, T + 30 * MIN);
  assert.ok(late.off > T + 30 * MIN && late.off <= T + 32 * MIN);
  assert.equal(late.in, Infinity);
  // in the cruise well past the planned descent, and the tracker has not seen it start
  const cruising = anchorsOf(SCHED, { out: iso(0), off: iso(14), on: null, in: null }, { ...AIR, tod_at: null, belt_on_at: null }, T + 200 * MIN);
  assert.ok(cruising.tod > T + 200 * MIN && cruising.beltOn > cruising.tod && cruising.on > T + 200 * MIN);
  assert.equal(cruising.beltOff, T + 20 * MIN);
  // a flight that landed without ever climbing through 10,000 ft
  const lowAir = { belt_off_at: null, toc_at: null, tod_at: iso(30), belt_on_at: null, max_climb_fpm: 1500, max_descent_fpm: 900, top_alt_ft: 8000 };
  assert.equal(anchorsOf(SCHED, TIMES, lowAir, T + 300 * MIN).beltOff, Infinity);
  // a Worker from before ADR-061 sends no air part: the sign follows the plan
  const old = anchorsOf(SCHED, { out: iso(0), off: iso(14), on: null, in: null }, null, T + 60 * MIN);
  assert.equal(old.beltOff, T + 20 * MIN);
  assert.equal(old.tod, old.on - 26 * MIN);
});

test('same OFP and same flight, same cabin; another OFP, another one', () => {
  const a = sim(), b = sim(), c = sim({ seed: 'other' });
  assert.deepEqual(stateAt(a, T + 90 * MIN), stateAt(b, T + 90 * MIN));
  assert.notDeepEqual(a.pax.map((p) => p.row), c.pax.map((p) => p.row));
  assert.equal(new Set(a.pax.map((p) => `${p.sx},${p.sy}`)).size, 120);        // a seat each
});

test('while the sign is on everybody is in the seat, and the lavatories are never over-booked', () => {
  const s = sim();
  for (let t = T; t <= T + 212 * MIN; t += 20 * SEC) {
    const st = stateAt(s, t);
    if (st.belt) assert.ok(st.pax.every((d) => d && d.cls === 'sit'), `out of the seat with the sign on at ${(t - T) / MIN}`);
    for (const d of st.pax) if (d) assert.ok(d.x > 230 && d.x < 1360 && d.y > 355 && d.y < 530, `outside the cabin: ${d.x},${d.y}`);
  }
  for (const g of ['front', 'rear']) for (let k = 0; k < LAV[g].at.length; k++) {
    const use = s.pax.flatMap((p) => p.trips).filter((x) => x.grp === g && x.k === k).sort((x, y) => x.start - y.start);
    use.forEach((x, i) => { if (i) assert.ok(x.start >= use[i - 1].end, 'two passengers in one lavatory'); });
  }
  // nobody waits at the door of an empty lavatory
  for (let t = A.beltOff; t <= A.beltOn; t += 20 * SEC) {
    const st = stateAt(s, t);
    for (const g of ['front', 'rear']) if (st.queue[g]) assert.ok(st.busy[g].every(Boolean), `a queue next to a free lavatory at ${(t - T) / MIN}`);
  }
  const trips = s.pax.reduce((n, p) => n + p.trips.length, 0);
  assert.ok(trips > 40 && trips < 110, `${trips} trips`);
  assert.ok(s.pax.every((p) => p.trips.every((x) => x.leave >= A.beltOff && x.back <= A.beltOn)));
});

test('nobody walks through a cart: a passenger waits in the seat while one is in the way', () => {
  const s = sim();
  for (const p of s.pax) for (const x of p.trips) {
    const door = LAV[x.grp].door;
    assert.ok(!carts(s, x.leave).some((c) => c.x > Math.min(p.sx, door) - 6 && c.x < Math.max(p.sx, door) + 6));
  }
});

test('the phases of the cabin through a whole flight', () => {
  const s = sim(), at = (min) => phaseLabel(s, T + min * MIN);
  assert.equal(at(3), 'הסעה · הדגמת בטיחות');
  assert.equal(at(12), 'מוכנים להמראה');
  assert.equal(at(16), 'טיפוס · חגורים');
  assert.equal(at(26), 'שירות שתייה');
  assert.equal(at(40), 'שירות ארוחות');
  assert.equal(at(160), 'שיוט שקט');
  assert.equal(at(185), 'הנמכה · הכנת התא');
  assert.equal(at(200), 'גישה לנחיתה · חגורים');
  assert.equal(at(208), 'הסעה לגייט');
  assert.equal(at(213), 'ירידה מהמטוס');
  assert.deepEqual(progress(s, T + 180 * MIN), { drink: 1, meal: 1, sales: 1 });
  // the crew sits for takeoff and for landing, and stands in the aisle for the demonstration
  assert.deepEqual(stateAt(s, T + 12 * MIN).crew.A, [266, AISLE_Y - 14]);
  assert.equal(stateAt(s, T + 3 * MIN).crew.A[1], AISLE_Y);
  // everybody is off within ten minutes of the gate
  assert.ok(stateAt(s, T + 221.9 * MIN).pax.every((d) => d == null));
});

test('service: everyone is served on a flight flown as planned; an early descent cuts it short', () => {
  assert.equal(servedShare(sim()), 1);
  const early = { ...A, tod: A.beltOff + 24 * MIN, beltOn: A.beltOff + 39 * MIN };       // the meal carts are half way
  const share = servedShare(sim({ a: early }));
  assert.ok(share > 0.4 && share < 0.9, `${share}`);
  assert.equal(carts(sim({ a: early }), early.tod + SEC).length, 0);                      // carts are stowed for the descent
  assert.equal(servedShare(sim({ tier: 'none' })), null);
  assert.equal(servedShare(sim({ a: { ...A, beltOff: Infinity } })), null);
});

test('a longer cruise only adds to what already happened', () => {
  const short = sim(), long = sim({ a: { ...A, tod: A.tod + 40 * MIN, beltOn: A.beltOn + 40 * MIN, on: A.on + 40 * MIN, in: A.in + 40 * MIN } });
  const before = (s) => s.pax.map((p) => p.trips.filter((x) => x.leave < A.beltOn - 30 * MIN));
  assert.deepEqual(before(long), before(short));
  assert.deepEqual(stateAt(long, T + 100 * MIN).pax, stateAt(short, T + 100 * MIN).pax);
});

test('announcements: in order, in both languages, with the figures of the flight', () => {
  const list = announcements(sim(), { callsign: 'ELY2569', dest: 'Tel Aviv', destUtcOffset: 3, cruiseFt: 32000 });
  assert.deepEqual(list.map((x) => x.key), ['welcome', 'demo', 'takeoff', 'belt-off', 'captain', 'sales', 'descent', 'belt-on', 'landed', 'gate']);
  assert.ok(list.every((x, i) => !i || x.at >= list[i - 1].at));
  assert.ok(list.every((x) => /[א-ת]/.test(x.he) && !/[א-ת]/.test(x.en)));
  const captain = list.find((x) => x.key === 'captain');
  assert.match(captain.en, /32,000 feet\. About 2 hours 50 minutes of flight remain, landing at about 00:25 local time/);
  assert.match(captain.he, /32,000 רגל\. נותרו בערך שעתיים ו-50 דקות לטיסה, והנחיתה צפויה ב-00:25 שעון מקומי/);
  assert.match(list[0].en, /flight ELY2569 to Tel Aviv/);
  // a short flight has no sales; a flight below 10,000 ft has no sign announcements
  assert.ok(!announcements(sim({ tier: 'drinks' }), { callsign: null, dest: 'LGAV', destUtcOffset: null, cruiseFt: null }).some((x) => x.key === 'sales'));
  const low = announcements(sim({ a: { ...A, beltOff: Infinity } }), { callsign: null, dest: 'LGAV', destUtcOffset: null, cruiseFt: null });
  assert.deepEqual(low.map((x) => x.key), ['welcome', 'demo', 'takeoff', 'descent', 'landed', 'gate']);
  assert.match(low.at(-2).en, /UTC/);
});

test('mood: three parts, each linear between its two ends', () => {
  // the example of sketch 14: 21 minutes on the ground, everyone served, a normal climb and descent
  const m = moodOf({ groundMin: 21, servedShare: 1, climbFpm: 2900, descentFpm: 1800 });
  assert.deepEqual([m.parts.ground, m.parts.service, m.parts.comfort, m.total], [5, 5, 5, 5]);
  assert.equal(moodOf({ groundMin: 60, servedShare: null, climbFpm: null, descentFpm: null }).total, 0);
  assert.equal(moodOf({ groundMin: 42.5, servedShare: null, climbFpm: null, descentFpm: null }).parts.ground, 2.5);
  assert.equal(moodOf({ groundMin: null, servedShare: 0.75, climbFpm: null, descentFpm: null }).parts.service, 2.5);
  assert.equal(moodOf({ groundMin: null, servedShare: 0.4, climbFpm: null, descentFpm: null }).parts.service, 0);
  // comfort is the worse of the climb and the descent; the real DLH314 climb (4,163 ft/min) is still full marks
  assert.equal(moodOf({ groundMin: null, servedShare: null, climbFpm: 4163, descentFpm: 1746 }).parts.comfort, 5);
  assert.equal(moodOf({ groundMin: null, servedShare: null, climbFpm: 3000, descentFpm: 4000 }).parts.comfort, 2.5);
  assert.equal(moodOf({ groundMin: null, servedShare: null, climbFpm: 7000, descentFpm: 1000 }).parts.comfort, 0);
  // a missing part is left out and the others are rescaled: 0.3×5 + 0.3×2.5 over 0.6
  assert.equal(moodOf({ groundMin: 20, servedShare: null, climbFpm: 3000, descentFpm: 4000 }).total, 3.8);
  assert.equal(moodOf({ groundMin: null, servedShare: null, climbFpm: null, descentFpm: null }), null);
  assert.equal(groundMinutes(TIMES), 21);
  assert.equal(groundMinutes({ ...TIMES, on: null }), null);
});

test('the record stored at closing, and the flight score with its fourth part', () => {
  const rec = cabinRecord({ id: '188328361', pax: 120, sched: SCHED }, TIMES, AIR);
  assert.deepEqual(rec, { tier: 'full', served_share: 1, climb_fpm: 2900, descent_fpm: 1800, belt_off_at: AIR.belt_off_at, toc_at: AIR.toc_at, tod_at: AIR.tod_at, belt_on_at: AIR.belt_on_at, top_alt_ft: 32000 });

  // 4 min late (5), block as planned (5), −142 FPM (4.667), mood 5: 0.25×5 + 0.25×5 + 0.3×4.667 + 0.2×5 = 4.9
  const late = { ...TIMES, out: iso(4), off: iso(18), on: iso(209), in: iso(216) };
  const s = flightScore(scoreInput(late, SCHED, -142, rec));
  assert.equal(s.total, 4.9);
  assert.deepEqual([s.weights.dep, s.weights.dur, s.weights.land, s.weights.mood], [0.25, 0.25, 0.3, 0.2]);
  assert.equal(s.mood.input.groundMin, 21);
  assert.equal(s.partial, false);
  // an unhappy cabin costs a fifth of its gap: mood 0 takes a whole point off a perfect flight
  const sad = flightScore(scoreInput(TIMES, SCHED, -100, { served_share: 0.4, climb_fpm: 7500, descent_fpm: 5200 }));
  assert.equal(sad.parts.mood, 1.5);                         // only the ground part is left: 0.3 × 5
  assert.equal(sad.total, 4.3);
  // without a tracked cabin the score is the one it always was: 30 / 30 / 40
  const plain = flightScore(scoreInput(late, SCHED, -142));
  assert.deepEqual([plain.weights.dep, plain.weights.land, plain.mood, plain.partial], [0.3, 0.4, null, false]);
  assert.equal(plain.total, 4.9);
  assert.equal(flightScore({ depLateMin: 38, durOverMin: 9, fpm: 388 }).total, 2.3);        // sketch 9, unchanged
});

let id = 0;
const F = (o = {}) => ({
  id: ++id, date: iso(212), callsign: 'X', origin: 'OMDB', dest: 'LLBG', plannedDest: 'LLBG', aircraft: 'B738', reg: '4X-A',
  source: 'tracked', timesSource: 'vvvv', blockMin: 212, airMin: 191, fpm: -150, pax: 120, seats: 189, cargoKg: 0, distanceNm: 1150,
  times: TIMES, sched: SCHED, lines: [{ code: 'tickets', cents: 1_000_000, source: 'auto' }], profitCents: 220_000,
  rateSetId: 1, closedAt: null, editedAt: null, crewFrom: 'OMDB', editable: true, ...o,
});

test('the company rating gets a passengers pillar once three flights had their cabin tracked', () => {
  const happy = { served_share: 1, climb_fpm: 3000, descent_fpm: 2000 }, sad = { served_share: 0.5, climb_fpm: 3000, descent_fpm: 5000 };
  const four = companyRating([F({ cabin: happy }), F({ cabin: happy }), F(), F(), F()]);
  assert.deepEqual(four.pillars.map((p) => p.key), ['safety', 'punctuality', 'profit', 'efficiency']);
  const five = companyRating([F({ cabin: happy }), F({ cabin: happy }), F({ cabin: sad }), F(), F()]);
  const mood = five.pillars.find((p) => p.key === 'mood');
  assert.equal(mood.score, 3.8);                             // (5 + 5 + 1.5) / 3
  assert.equal(five.overall, Math.round((five.pillars.reduce((s, p) => s + p.score, 0) / 5) * 10) / 10);
  assert.equal(scoreOf(F({ cabin: happy })).mood.total, 5);
  assert.equal(scoreOf(F()).mood, null);
});

test('only the aircraft in the picture has a cabin; night flights sleep more', () => {
  assert.ok(cabinFits('B738', 120) && cabinFits('B38M', 189) && cabinFits('B737', 1));
  assert.ok(!cabinFits('A320', 120) && !cabinFits('B739', 200) && !cabinFits('B738', 0) && !cabinFits(null, 100) && !cabinFits('B738', null));
  assert.ok(isNight(Date.UTC(2026, 9, 2, 18, 0), 4) && !isNight(Date.UTC(2026, 9, 2, 8, 0), 3));
  const count = (night) => simulate({ seed: 'x', pax: 189, tier: 'full', night, a: A }).pax.filter((p) => p.sleeps).length;
  assert.ok(count(true) > count(false) * 1.5);
});

test('migration 005 adds the cabin column and keeps every flight that is already there', async () => {
  const MIG = new URL('../db/migrations/', import.meta.url);
  const files = readdirSync(MIG).filter((x) => x.endsWith('.sql')).sort();
  const db = new PGlite();
  for (const f of files.filter((x) => x < '005')) await db.exec(readFileSync(new URL(f, MIG), 'utf8'));
  await db.query('INSERT INTO rate_sets (note, params) VALUES ($1, $2)', ['v1', readFileSync(new URL('../db/rate-set-v1.json', import.meta.url), 'utf8')]);
  await db.query(`INSERT INTO flights (status, source, origin_icao, dest_planned_icao, rate_set_id, ofp_id) VALUES ('closed', 'tracked', 'LLBG', 'LGAV', 1, 'before')`);
  await db.exec(readFileSync(new URL('005_cabin.sql', MIG), 'utf8'));
  await db.query(`INSERT INTO flights (status, source, origin_icao, dest_planned_icao, rate_set_id, ofp_id, cabin) VALUES ('closed', 'tracked', 'LLBG', 'LGAV', 1, 'after', $1::jsonb)`,
    [JSON.stringify(cabinRecord({ id: 'after', pax: 120, sched: SCHED }, TIMES, AIR))]);
  const rows = (await db.query(`SELECT ofp_id, cabin->>'tier' AS tier, (cabin->>'served_share')::float8 AS share FROM flights ORDER BY id`)).rows;
  assert.deepEqual(rows, [{ ofp_id: 'before', tier: null, share: null }, { ofp_id: 'after', tier: 'full', share: 1 }]);
});
