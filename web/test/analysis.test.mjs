// WP7: rating (ADR-036), ranks and milestones (ADR-038), periods and sections (ADR-035).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { companyRating, rankFor, milestoneCrossings, nextMilestones } from '../src/lib/rating.ts';
import { rangeOf, previousRange, shift, kpis, trend, landings, network, inRange } from '../src/lib/analysis.ts';

let id = 0;
const F = (o = {}) => ({
  id: ++id, date: '2026-09-10T10:00:00Z', callsign: 'X', origin: 'LLBG', dest: 'LGAV', plannedDest: 'LGAV', aircraft: 'B738', reg: '4X-A',
  source: 'tracked', timesSource: 'vvvv', blockMin: 120, airMin: 100, fpm: -150, pax: 170, seats: 189, cargoKg: 0, distanceNm: 650,
  times: { out: '2026-09-10T08:05:00Z', off: '2026-09-10T08:20:00Z', on: '2026-09-10T09:50:00Z', in: '2026-09-10T10:00:00Z' },
  sched: { out: '2026-09-10T08:00:00Z', off: null, on: null, in: '2026-09-10T09:58:00Z' },
  lines: [{ code: 'tickets', cents: 1_000_000, source: 'auto' }, { code: 'fuel', cents: -780_000, source: 'manual' }],
  profitCents: 220_000, rateSetId: 1, closedAt: null, editedAt: null, crewFrom: 'LLBG', editable: true, ...o,
});

test('rating is "building" under 5 flights, then 4 pillars averaged', () => {
  assert.equal(companyRating([F(), F(), F(), F()]), null);
  const r = companyRating(Array.from({ length: 6 }, () => F()));
  assert.equal(r.pillars.length, 4);
  // safety: 0.7 × lerp(150; 450→0, 120→5) + 0.3 × 5 (no hard landings) = 0.7 × 4.545 + 1.5 = 4.7
  assert.equal(r.pillars.find((p) => p.key === 'safety').score, 4.7);
  assert.equal(r.pillars.find((p) => p.key === 'punctuality').score, 5);          // 5 min late = on time
  assert.equal(r.pillars.find((p) => p.key === 'profit').score, 3.7);              // 22% margin
  assert.equal(r.overall, Math.round((r.pillars.reduce((s, p) => s + p.score, 0) / 4) * 10) / 10);
});

test('rating uses only the last 30 non-historical flights', () => {
  const good = Array.from({ length: 30 }, () => F());
  const bad = Array.from({ length: 30 }, () => F({ fpm: -700 }));
  assert.ok(companyRating([...good, ...bad]).pillars[0].score > 4);   // newest first
  assert.ok(companyRating([...bad, ...good]).pillars[0].score < 1);
  assert.equal(companyRating(Array.from({ length: 10 }, () => F({ source: 'historical' }))), null);
});

test('ranks by block hours (ADR-038)', () => {
  assert.equal(rankFor(0).name, 'טייס משנה');
  assert.equal(rankFor(99.9).next.name, 'טייס משנה בכיר');
  assert.equal(rankFor(300).name, 'קברניט');
  assert.equal(rankFor(3200).next, null);
});

test('milestones: crossings carry the flight that crossed them; streak keeps its best', () => {
  const list = Array.from({ length: 12 }, (_, i) => F({ date: `2026-09-${String(i + 1).padStart(2, '0')}T10:00:00Z`, fpm: i === 7 ? -500 : -120 }));
  const { crossings, totals, best } = milestoneCrossings(list);
  assert.equal(crossings.find((c) => c.cat === 'flights' && c.threshold === 10).flightId, list[9].id);
  assert.ok(crossings.some((c) => c.cat === 'soft_streak' && c.threshold === 5));
  assert.equal(totals.soft_streak, 4);                                   // broken at the 8th flight
  assert.equal(best.soft_streak, 7);
  assert.equal(nextMilestones(totals, best).find((m) => m.cat === 'soft_streak').next, 10);   // not 5 again
});

test('periods: month / quarter / year, previous and navigation', () => {
  const m = rangeOf('m', '2026-09-25');
  assert.equal(m.from.toISOString(), '2026-09-01T00:00:00.000Z');
  assert.equal(m.label, 'ספטמבר 2026');
  assert.equal(previousRange(m).label, 'אוגוסט 2026');
  assert.equal(shift(m, 1), '2026-10-01');
  assert.equal(rangeOf('q', '2026-09-25').label, 'רבעון 3 · 2026');
  assert.equal(previousRange(rangeOf('y', '2026-01-01')).label, '2025');
  assert.equal(previousRange(rangeOf('all', '2026-01-01')), null);
  const c = rangeOf('custom', '2026-09-25', '2026-09-01', '2026-09-10');
  assert.ok(inRange(F({ date: '2026-09-10T23:00:00Z' }), c));
  assert.ok(!inRange(F({ date: '2026-09-11T00:00:00Z' }), c));
});

test('KPIs: margin ignores historical flights, OTP from times', () => {
  const k = kpis([F(), F({ source: 'historical', lines: [{ code: 'legacy_profit', cents: 500_000, source: 'legacy' }], profitCents: 500_000 })]);
  assert.equal(k.flights, 2);
  assert.equal(k.netCents, 720_000);
  assert.equal(k.margin, 0.22);
  assert.equal(k.otp, 1);
});

test('trend: weekly buckets for a month, empty weeks are zero', () => {
  const t = trend([F({ date: '2026-09-02T10:00:00Z' }), F({ date: '2026-09-20T10:00:00Z' })], rangeOf('m', '2026-09-01'));
  assert.equal(t.length, 5);
  assert.deepEqual(t.map((b) => b.flights), [1, 0, 1, 0, 0]);
});

test('landings and network', () => {
  const list = [F({ fpm: -90 }), F({ fpm: -450, lines: [{ code: 'hard_landing', cents: -118_500, source: 'auto' }] }),
    F({ dest: 'LGTS', lines: [{ code: 'diversion', cents: -900_000, source: 'auto' }] })];
  const L = landings(list, list);
  assert.deepEqual(L.counts, [1, 1, 0, 0, 1, 0]);
  assert.equal(L.hard, 1);
  assert.equal(L.penaltyCents, 118_500);
  assert.equal(L.best.fpm, -90);
  const N = network(list, [F({ date: '2026-08-01T00:00:00Z' }), ...list], rangeOf('m', '2026-09-01'));
  assert.deepEqual(N.diversions, { n: 1, cents: 900_000 });
  assert.equal(N.newAirports, 1);                                        // LGTS
});
