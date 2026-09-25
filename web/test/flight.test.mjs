// WP5: completion-form logic (shared by browser preview and server close).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localOut, missing, toEngineInput, timesSource, sourceOf } from '../src/lib/flight-input.ts';
import { summarizeOfp as appSummary } from '../src/lib/ofp.ts';
import { summarizeOfp as workerSummary } from '../../tracker/src/ofp.js';
import { compute } from '../src/lib/engine/index.ts';
import { DEFAULTS } from '../src/lib/rates/params.ts';

const RAW = {
  params: { request_id: '186942814', time_generated: '1789891951', units: 'kgs' }, atc: { callsign: 'ELY2569' },
  origin: { icao_code: 'LPPT', pos_lat: '38.774167', pos_long: '-9.134167', elevation: '355' },
  destination: { icao_code: 'LLBG', pos_lat: '32.009444', pos_long: '34.885556', elevation: '134' },
  alternate: { icao_code: 'LLER' }, general: { route_distance: '2240', gc_distance: '2171' },
  aircraft: { icao_code: 'B738', reg: 'N738PM', max_passengers: '189' },
  weights: { max_tow: '79333', max_ldw: '66361', oew: '42264', pax_count: '168', freight_added: '0', payload: '18625', cargo: '4146', bag_count: '168', bag_weight: '24.948' },
  times: { sched_out: '1789893900', sched_off: '1789895100', sched_on: '1789912020', sched_in: '1789912500', orig_timezone: '1' },
};
const OFP = appSummary(RAW);
const T = { out: '2026-09-20T08:47:00.000Z', off: '2026-09-20T09:05:00.000Z', on: '2026-09-20T14:08:00.000Z', in: '2026-09-20T14:16:00.000Z' };
const draft = (o = {}) => ({ ofp: OFP, times: T, fpm: -170, manual: { fuel: 25443, ground: 2733, catering: 1229 }, fuelUsdPerKg: null, rating: null, positioningNm: null, diversionNm: null, ...o });

test('app and Worker summarise an OFP identically', () => {
  assert.deepEqual(appSummary(RAW), workerSummary(RAW));
  assert.deepEqual(appSummary({ ...RAW, params: { ...RAW.params, units: 'lbs' } }), workerSummary({ ...RAW, params: { ...RAW.params, units: 'lbs' } }));
});

test('local OUT time uses the origin offset (LPPT +1)', () => {
  assert.deepEqual(localOut(OFP, T), { month: 8, dow: 0, hour: 9 });            // 08:47Z Sunday → 09:47 local
  assert.deepEqual(localOut(OFP, { out: null, off: null, on: null, in: null }).hour, 9);   // falls back to sched OUT 08:45Z
  assert.equal(localOut({ ...OFP, orig_utc_offset: 5.5 }, { ...T, out: '2026-09-20T20:40:00.000Z' }).hour, 2);   // +5:30 crosses midnight
});

test('missing: times, order, GSX, FPM', () => {
  assert.deepEqual(missing(draft()), []);
  assert.deepEqual(missing(draft({ times: { ...T, in: null } })), ['IN']);
  assert.ok(missing(draft({ times: { ...T, on: '2026-09-20T08:00:00.000Z' } })).some((m) => m.startsWith('סדר')));
  assert.deepEqual(missing(draft({ manual: { fuel: 1, ground: null, catering: 1 }, fpm: null })), ['עלויות GSX', 'FPM']);
});

test('engine input from a tracked flight (block/air minutes, cargo = freight_added)', () => {
  const i = toEngineInput(draft());
  assert.equal(i.blockMin, 329);
  assert.equal(i.airMin, 303);
  assert.equal(i.cargoKg, 0);
  assert.equal(i.distanceNm, 2240);
  assert.equal(i.mtowKg, 79333);
  const r = compute(DEFAULTS, i);
  assert.equal(r.profitCents, r.lines.reduce((s, l) => s + l.amountCents, 0));
  assert.equal(toEngineInput(draft({ times: { ...T, in: null } })), null);
});

test('times source and flight source', () => {
  const none = { out: null, off: null, on: null, in: null };
  assert.equal(timesSource(T, T), 'vvvv');
  assert.equal(timesSource({ ...T, on: null, in: null }, T), 'vvmm');
  assert.equal(timesSource(none, T), 'mmmm');
  assert.equal(sourceOf('vvvv'), 'tracked');
  assert.equal(sourceOf('vvmm'), 'partial');
  assert.equal(sourceOf('mmmm'), 'manual');
});
