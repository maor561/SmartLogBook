// WP11 (sketch s9, ADR-058): the flight score, and the punctuality pillar that
// now counts flights that kept their planned duration as well as departures on time.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { flightScore, scoreInput, scoreOf, depOnTime, durOnTime } from '../src/lib/flight-score.ts';
import { companyRating, durationOnTime, onTime } from '../src/lib/rating.ts';
import { ops, scores } from '../src/lib/analysis.ts';

let id = 0;
// Planned: OUT 08:00, IN 10:00 (block 120). `dep` = minutes late at OUT, `over` = minutes over the planned block.
const F = ({ dep = 0, over = 0, fpm = -150, ...o } = {}) => {
  const out = Date.UTC(2026, 8, 10, 8, dep), inn = out + (120 + over) * 60000;
  return {
    id: ++id, date: new Date(inn).toISOString(), callsign: 'X', origin: 'LLBG', dest: 'LGAV', plannedDest: 'LGAV', aircraft: 'B738', reg: '4X-A',
    source: 'tracked', timesSource: 'vvvv', blockMin: 120 + over, airMin: 100, fpm, pax: 170, seats: 189, cargoKg: 0, distanceNm: 650,
    times: { out: new Date(out).toISOString(), off: null, on: null, in: new Date(inn).toISOString() },
    sched: { out: '2026-09-10T08:00:00.000Z', off: null, on: null, in: '2026-09-10T10:00:00.000Z' },
    lines: [{ code: 'tickets', cents: 1_000_000, source: 'auto' }], profitCents: 220_000,
    rateSetId: 1, closedAt: null, editedAt: null, crewFrom: 'LLBG', editable: true, ...o,
  };
};

test('the approved examples from sketch 9', () => {
  // 4 min late, 2 min over, −142 FPM: 0.3×5 + 0.3×5 + 0.4×4.667 = 4.87
  assert.equal(flightScore({ depLateMin: 4, durOverMin: 2, fpm: 142 }).total, 4.9);
  // 38 min late (2.0), 9 min over (4.5), −388 FPM (0.94): 0.6 + 1.35 + 0.376 = 2.33
  const bad = flightScore({ depLateMin: 38, durOverMin: 9, fpm: 388 });
  assert.equal(bad.total, 2.3);
  assert.deepEqual([bad.parts.dep, bad.parts.dur].map((x) => Math.round(x * 10) / 10), [2, 4.5]);
});

test('each part is linear between its two ends, and never outside 0–5', () => {
  const part = (i) => flightScore({ depLateMin: null, durOverMin: null, fpm: null, ...i });
  assert.equal(part({ depLateMin: 5 }).parts.dep, 5);
  assert.equal(part({ depLateMin: 60 }).parts.dep, 0);
  assert.equal(part({ depLateMin: 32.5 }).parts.dep, 2.5);
  assert.equal(part({ depLateMin: -20 }).parts.dep, 5);          // early is full marks
  assert.equal(part({ durOverMin: 45 }).parts.dur, 0);
  assert.equal(part({ durOverMin: -30 }).parts.dur, 5);          // shorter than planned is full marks
  assert.equal(part({ fpm: 120 }).parts.land, 5);
  assert.equal(part({ fpm: 900 }).parts.land, 0);
});

test('a part with no data is left out and the weights are rescaled', () => {
  const s = flightScore({ depLateMin: null, durOverMin: null, fpm: 285 });   // landing alone: 2.5
  assert.equal(s.total, 2.5);
  assert.equal(s.partial, true);
  // departure 5.0 (w 0.3) and landing 0 (w 0.4): 1.5 / 0.7 = 2.14
  assert.equal(flightScore({ depLateMin: 0, durOverMin: null, fpm: 500 }).total, 2.1);
  assert.equal(flightScore({ depLateMin: null, durOverMin: null, fpm: null }), null);
});

test('duration is the block against the planned block, so a late departure is not counted twice', () => {
  const late = F({ dep: 40, over: 0 });                 // left 40 minutes late, flew exactly the planned block
  const i = scoreInput(late.times, late.sched, late.fpm);
  assert.deepEqual([i.depLateMin, i.durOverMin, i.fpm], [40, 0, 150]);
  assert.equal(depOnTime(i), false);
  assert.equal(durOnTime(i), true);
  assert.equal(onTime(late), false);
  assert.equal(durationOnTime(late), true);
});

test('historical flights have no score; manual flights without times get a partial one', () => {
  assert.equal(scoreOf(F({ source: 'historical' })), null);
  const manual = F({ source: 'manual', times: { out: null, off: null, on: null, in: null }, fpm: -204 });
  assert.equal(scoreOf(manual).partial, true);
  assert.equal(scoreOf(manual).total, 3.7);             // landing alone: 5 × (450 − 204) / 330
});

test('punctuality pillar: the mean of departures on time and durations kept (ADR-058)', () => {
  // 6 flights: 3 leave late (dep on time 50%), all keep the planned duration (100%) → 75% → lerp(40%→0, 90%→5) = 3.5
  const win = [F({ dep: 30 }), F({ dep: 30 }), F({ dep: 30 }), F(), F(), F()];
  const p = companyRating(win).pillars.find((x) => x.key === 'punctuality');
  assert.equal(p.score, 3.5);
  assert.match(p.why, /50% יציאות בזמן/);
  assert.match(p.why, /100% לא חרגו/);
  // before ADR-058 this was departures alone: 50% → 1.0
  const allLateAndLong = Array.from({ length: 6 }, () => F({ dep: 30, over: 30 }));
  assert.equal(companyRating(allLateAndLong).pillars.find((x) => x.key === 'punctuality').score, 0);
});

test('analysis: duration-on-time rate, and the score series oldest first', () => {
  const noTimes = { out: null, off: null, on: null, in: null };          // historical flights carry no times
  const list = [F({ dep: 0, over: 20 }), F({ dep: 0, over: 0 }), F({ source: 'historical', times: noTimes })];
  assert.equal(ops(list).durOk, 0.5);
  const sc = scores([F({ date: '2026-09-12T10:00:00Z', fpm: -120 }), F({ date: '2026-09-11T10:00:00Z', fpm: -450 }), F({ source: 'historical' })]);
  assert.equal(sc.n, 2);
  assert.deepEqual(sc.last.map((x) => x.total), [3, 5]);    // oldest first: 0.3×5 + 0.3×5 + 0 = 3.0, then 5.0
  assert.equal(sc.avg, 4);
});
