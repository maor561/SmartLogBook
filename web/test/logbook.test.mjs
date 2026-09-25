// WP6: logbook filters — one function for list, map and Excel (ADR-023).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyFilters, filtersFromQuery, filtersToQuery, NO_FILTERS, periodStart, summarize, tagsOf } from '../src/lib/logbook-filter.ts';

const base = {
  callsign: 'ELY1', reg: '4X-EKA', aircraft: 'B738', source: 'tracked', timesSource: 'vvvv', fpm: -150, pax: 150, seats: 189,
  cargoKg: 0, distanceNm: 600, blockMin: 100, airMin: 80, lines: [], rateSetId: 1, closedAt: null, editedAt: null, crewFrom: 'LLBG', editable: true,
  times: { out: null, off: null, on: null, in: null }, sched: { out: null, off: null, on: null, in: null },
};
const F = [
  { ...base, id: 1, date: '2026-09-20T10:00:00Z', origin: 'LLBG', dest: 'LGAV', plannedDest: 'LGAV', profitCents: 300000 },
  { ...base, id: 2, date: '2026-09-02T10:00:00Z', origin: 'LGAV', dest: 'LGTS', plannedDest: 'LLBG', profitCents: -50000, callsign: 'ELY2',
    lines: [{ code: 'diversion', cents: -900000, source: 'auto' }] },
  { ...base, id: 3, date: '2026-07-10T10:00:00Z', origin: 'LTFM', dest: 'LLBG', plannedDest: 'LLBG', profitCents: 100000, source: 'partial', aircraft: 'A21N', fpm: -455,
    lines: [{ code: 'positioning', cents: -700000, source: 'auto' }, { code: 'hard_landing', cents: -118500, source: 'auto' }] },
  { ...base, id: 4, date: '2025-12-01T10:00:00Z', origin: 'LLBG', dest: 'EGLL', plannedDest: 'EGLL', profitCents: 800000, source: 'historical', editedAt: '2026-01-01T00:00:00Z' },
];
const NOW = new Date('2026-09-25T12:00:00Z');
const ids = (list) => list.map((x) => x.id);
const run = (o) => ids(applyFilters(F, { ...NO_FILTERS, ...o }, NOW));

test('periods: month, 3 months, year, all, custom', () => {
  assert.deepEqual(run({ period: 'm' }), [1, 2]);
  assert.deepEqual(run({ period: 'q' }), [1, 2, 3]);
  assert.deepEqual(run({ period: 'y' }), [1, 2, 3]);
  assert.deepEqual(run({ period: 'all' }), [1, 2, 3, 4]);
  assert.deepEqual(run({ period: 'custom', from: '2026-09-02', to: '2026-09-02' }), [2]);
  assert.equal(periodStart('q', NOW).toISOString(), '2026-07-01T00:00:00.000Z');
});

test('search, airport (origin or actual destination), aircraft, source', () => {
  assert.deepEqual(run({ q: 'ely2' }), [2]);
  assert.deepEqual(run({ q: 'lgts' }), [2]);
  assert.deepEqual(run({ airport: 'LLBG' }), [1, 3, 4]);
  assert.deepEqual(run({ aircraft: 'A21N' }), [3]);
  assert.deepEqual(run({ sources: ['partial', 'historical'] }), [3, 4]);
});

test('tags: diversion, positioning, hard landing, loss, edited — and all must match', () => {
  assert.deepEqual(tagsOf(F[1]), ['div', 'loss']);
  assert.deepEqual(tagsOf(F[2]), ['pos', 'hard']);
  assert.deepEqual(run({ tags: ['div'] }), [2]);
  assert.deepEqual(run({ tags: ['pos', 'hard'] }), [3]);
  assert.deepEqual(run({ tags: ['pos', 'loss'] }), []);
  assert.deepEqual(run({ tags: ['edited'] }), [4]);
});

test('summary follows the filter', () => {
  const s = summarize(applyFilters(F, { ...NO_FILTERS, period: 'm' }, NOW));
  assert.deepEqual(s, { flights: 2, blockMin: 200, profitCents: 250000, avgCents: 125000, pax: 300 });
  assert.equal(summarize([]).avgCents, null);
});

test('filters survive the round trip through the export URL', () => {
  const f = { ...NO_FILTERS, q: 'ely', period: 'custom', from: '2026-01-01', to: '2026-09-30', airport: 'LLBG', aircraft: 'B738', sources: ['tracked', 'manual'], tags: ['div', 'loss'] };
  assert.deepEqual(filtersFromQuery(new URLSearchParams(filtersToQuery(f))), f);
  assert.deepEqual(filtersFromQuery(new URLSearchParams('tags=div,bogus&period=zzz')), { ...NO_FILTERS, tags: ['div'] });
  assert.equal(filtersToQuery(NO_FILTERS), '');
});
