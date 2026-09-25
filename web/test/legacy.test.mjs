// WP8: mapping old MongoDB flights to historical rows (ADR-030).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapLegacy } from '../src/lib/legacy-map.ts';

const doc = {
  _id: '6aafe43637eed9abdf945440', date: '2026-09-20T13:48:41.745Z', origin: 'lppt', destination: 'LLBG',
  aircraft: 'B738', distance: 2240, duration_mins: 303, passengers: 168, payload: 18625, fpm: -157, profit: 34966.4,
  aircraft_max_passengers: 189, fuel_cost_override: 25443,
};

test('a normal document maps field by field; profit to cents', () => {
  assert.deepEqual(mapLegacy(doc), {
    legacyId: '6aafe43637eed9abdf945440', date: '2026-09-20T13:48:41.745Z', origin: 'LPPT', dest: 'LLBG', aircraft: 'B738',
    seats: 189, pax: 168, payloadKg: 18625, distanceNm: 2240, plannedAirMin: 303, fpm: -157, profitCents: 3496640,
  });
});

test('fpm 0 (never entered) becomes -145 by the user decision (ADR-048); missing stays unknown', () => {
  assert.equal(mapLegacy({ ...doc, fpm: 0 }).fpm, -145);
  assert.equal(mapLegacy({ ...doc, fpm: undefined }).fpm, null);
});

test('losses stay negative; broken documents are reported, not guessed', () => {
  assert.equal(mapLegacy({ ...doc, profit: -4210 }).profitCents, -421000);
  assert.match(mapLegacy({ ...doc, origin: '' }).error, /קוד שדה/);
  assert.match(mapLegacy({ ...doc, date: 'yesterday' }).error, /תאריך/);
  assert.match(mapLegacy({ ...doc, profit: null }).error, /רווח/);
});
