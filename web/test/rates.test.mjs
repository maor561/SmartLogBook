// Run with: npm test  (node --test, TypeScript stripped natively by Node 24)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULTS, getAt, leafPaths, validate, withChanges } from '../src/lib/rates/params.ts';
import { FIELDS } from '../src/lib/rates/catalogue.ts';
import { distanceNm, nearest, boundingBox } from '../src/lib/geo.ts';
import { toAirports } from '../scripts/airports.mjs';

test('catalogue covers every rate parameter exactly once', () => {
  const paths = FIELDS.map((f) => f.path);
  assert.equal(new Set(paths).size, paths.length, 'duplicate path');
  assert.deepEqual([...paths].sort(), leafPaths().sort());
});

test('v1 defaults are valid and calibrated (ADR-034)', () => {
  assert.deepEqual(validate(DEFAULTS), []);
  assert.equal(DEFAULTS.fare.k, 1.51);
  assert.equal(DEFAULTS.lease.perBlockHourPerMtowT, 10.5);
});

test('withChanges never mutates the source version', () => {
  const next = withChanges(DEFAULTS, { 'fare.k': 1.6, 'season.6': 1.3 });
  assert.equal(next.fare.k, 1.6);
  assert.equal(getAt(next, 'season.6'), 1.3);
  assert.equal(DEFAULTS.fare.k, 1.51);
  assert.throws(() => withChanges(DEFAULTS, { 'fare.nope': 1 }));
});

test('validate rejects inconsistent tables', () => {
  assert.ok(validate(withChanges(DEFAULTS, { 'clamp.min': 1.5 })).length);
  assert.ok(validate(withChanges(DEFAULTS, { 'hardLanding.visualUpToFpm': 300 })).length);
  assert.ok(validate(withChanges(DEFAULTS, { 'crew.captain': -1 })).length);
  assert.deepEqual(validate(withChanges(DEFAULTS, { 'fuel.minPct': -20 })), []);
});

test('great-circle distance', () => {
  // LLBG → LICC ≈ 1,029 NM great circle; LLBG → LPPT ≈ 2,171 NM (≈ 4,021 km)
  assert.ok(Math.abs(distanceNm(32.011398, 34.8867, 37.466801, 15.0664) - 1029) < 3);
  assert.ok(Math.abs(distanceNm(32.011398, 34.8867, 38.7813, -9.13592) - 2171) < 3);
  assert.equal(distanceNm(10, 10, 10, 10), 0);
});

test('nearest airport picks the right ICAO for test points', () => {
  const sample = [
    { icao: 'LLBG', lat: 32.011398, lon: 34.8867 },
    { icao: 'LLER', lat: 29.727009, lon: 35.014116 },
    { icao: 'LICC', lat: 37.466801, lon: 15.0664 },
    { icao: 'LPPT', lat: 38.7813, lon: -9.13592 },
  ];
  assert.equal(nearest(sample, 32.00, 34.90).icao, 'LLBG');   // on the LLBG runway
  assert.equal(nearest(sample, 29.72, 35.02).icao, 'LLER');
  assert.equal(nearest(sample, 38.77, -9.13).icao, 'LPPT');
  const box = boundingBox(60, 10, 60);
  // cos(60°) = 0.5 → the longitude span is twice the latitude span
  assert.ok(Math.abs((box.maxLon - box.minLon) - 2 * (box.maxLat - box.minLat)) < 1e-9);
});

test('OurAirports parser: quotes, ICAO filter, duplicates', () => {
  const csv = [
    'id,ident,type,name,latitude_deg,longitude_deg,elevation_ft,continent,iso_country,iso_region,municipality,scheduled_service,icao_code',
    '1,LLBG,large_airport,"Ben Gurion, Intl",32.01,34.88,135,AS,IL,IL-M,Tel Aviv,yes,LLBG',
    '2,X1,heliport,Pad,1,1,0,AS,IL,IL-M,,no,LLHP',
    '3,ZZ,small_airport,No code,1,1,0,AS,IL,IL-M,,no,',
    '4,LLBG2,small_airport,"Dup ""old""",32,34,0,AS,IL,IL-M,,no,LLBG',
  ].join('\n');
  const list = toAirports(csv);
  assert.equal(list.length, 1);
  assert.equal(list[0].name, 'Ben Gurion, Intl');
  assert.equal(list[0].type, 'large_airport');
});

test('migration seeds from the same JSON the code uses', () => {
  const src = readFileSync(new URL('../scripts/migrate.mjs', import.meta.url), 'utf8');
  assert.match(src, /db\/rate-set-v1\.json/);
});
