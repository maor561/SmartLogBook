// WP4: replay synthetic flights through the state machine. When a real
// recording exists (WP0 item 2), it gets its own replay test here too.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IDLE, step, acknowledge, wantsOfp, matches } from '../src/machine.js';
import { summarizeOfp } from '../src/ofp.js';
import { signToken, verifyToken } from '../src/auth.js';

const OFP = {
  id: '186942814', generated_at: '2026-09-25T06:00:00.000Z', callsign: 'ELY2569',
  origin: { icao: 'LPPT', lat: 38.774167, lon: -9.134167, elev_ft: 355 },
  dest: { icao: 'LLBG', lat: 32.009444, lon: 34.885556, elev_ft: 134 },
};
const GATE = { lat: 38.7700, lon: -9.1300 };
const t = (min) => new Date(Date.parse('2026-09-25T07:00:00Z') + min * 60e3).toISOString();
const P = (o) => ({ callsign: 'ELY2569', dep: 'LPPT', arr: 'LLBG', lat: GATE.lat, lon: GATE.lon, alt_ft: 355, gs_kt: 0, ...o });

// Runs a list of per-minute samples: null = not in feed, 'ERR' = feed outage.
function replay(samples, start = { ...IDLE }, ofpAt = 0) {
  let s = start;
  const log = [];
  samples.forEach((p, i) => {
    const input = { now: t(i), feedOk: p !== 'ERR', pilot: p === 'ERR' ? null : p };
    if (i === ofpAt) input.ofp = OFP;
    const r = step(s, input);
    s = r.state;
    log.push(...r.events);
  });
  return { s, log, path: log.map((e) => e.to) };
}

const gate = [P({}), P({})];
const pushTaxi = [P({ gs_kt: 2, lat: GATE.lat + 0.001 }), P({ gs_kt: 15, lat: GATE.lat + 0.005 })];
const takeoff = [P({ gs_kt: 150, alt_ft: 2500, lat: 38.80 }), P({ gs_kt: 280, alt_ft: 9000, lat: 38.9 })];
const cruise = [P({ gs_kt: 460, alt_ft: 37000, lat: 36, lon: 10 })];
const landing = [P({ gs_kt: 140, alt_ft: 1200, lat: 32.1, lon: 34.9 }), P({ gs_kt: 20, alt_ft: 134, lat: 32.005, lon: 34.88 })];
const stop = P({ gs_kt: 0, alt_ft: 134, lat: 32.007, lon: 34.882 });
const park = [P({ gs_kt: 8, alt_ft: 134, lat: 32.006, lon: 34.881 }), stop, stop, stop];

test('a normal flight: armed → OUT → OFF → ON → IN', () => {
  const { s, path } = replay([...gate, ...pushTaxi, ...takeoff, ...cruise, ...landing, ...park]);
  assert.deepEqual(path, ['armed', 'taxi_out', 'airborne', 'taxi_in', 'arrived']);
  assert.equal(s.out_at, t(2));
  assert.equal(s.off_at, t(4));
  assert.equal(s.on_at, t(8));
  assert.equal(s.in_at, t(10));                        // first of three stopped minutes
  assert.deepEqual(s.landing, { lat: 32.005, lon: 34.88 });
});

test('no OFP match → stays idle (wrong route and callsign)', () => {
  const other = { ...P({}), callsign: 'XYZ1', dep: 'EGLL', arr: 'KJFK' };
  const { path } = replay([other, other]);
  assert.deepEqual(path, []);
  assert.equal(matches({ ...other, callsign: 'ely2569' }, OFP), true);   // callsign alone is enough, case-insensitive
});

test('matched while already taxiing → OUT at that same minute', () => {
  const { s, path } = replay([P({ gs_kt: 19, lat: GATE.lat + 0.002 }), P({ gs_kt: 9, lat: GATE.lat + 0.004 })]);
  assert.deepEqual(path, ['armed', 'taxi_out']);
  assert.equal(s.out_at, t(0));
});

test('must be near the origin to arm', () => {
  const far = P({ lat: 40, lon: -3 });
  assert.deepEqual(replay([far, far]).path, []);
});

test('disconnect in flight, reconnect within 30 min → same flight', () => {
  const gap = Array(20).fill(null);
  const { s, path } = replay([...gate, ...pushTaxi, ...takeoff, ...gap, ...cruise, ...landing, ...park]);
  assert.deepEqual(path, ['armed', 'taxi_out', 'airborne', 'disconnected', 'airborne', 'taxi_in', 'arrived']);
  assert.equal(s.off_at, t(4));
});

test('30 minutes without reconnect → interrupted', () => {
  const { s, path } = replay([...gate, ...pushTaxi, ...takeoff, ...Array(30).fill(null)]);
  assert.equal(path.at(-1), 'interrupted');
  assert.equal(s.off_at, t(4));
});

test('feed outage does not count toward the 30 minutes (ADR-024)', () => {
  const samples = [...gate, ...pushTaxi, ...takeoff, ...Array(20).fill(null), ...Array(30).fill('ERR'), ...Array(5).fill(null)];
  const { s } = replay(samples);
  assert.equal(s.state, 'disconnected');
  assert.equal(s.absent_ticks, 25);
});

test('disconnect after landing = IN at last seen (ADR-020)', () => {
  const { s, path } = replay([...gate, ...pushTaxi, ...takeoff, ...landing, P({ gs_kt: 12, alt_ft: 134, lat: 32.006, lon: 34.881 }), null]);
  assert.equal(path.at(-1), 'arrived');
  assert.equal(s.in_at, t(8));                        // the last minute the pilot was seen
});

test('joined already airborne → partial flight, no OUT/OFF', () => {
  const { s, path } = replay([P({ gs_kt: 450, alt_ft: 35000, lat: 36, lon: 10 }), ...landing, ...park]);
  assert.deepEqual(path, ['airborne', 'taxi_in', 'arrived']);
  assert.equal(s.joined, 'airborne');
  assert.equal(s.out_at, null);
  assert.equal(s.off_at, null);
});

test('unflown plan expires after 12 h', () => {
  let s = step({ ...IDLE }, { now: t(0), feedOk: true, pilot: P({}), ofp: OFP }).state;
  assert.equal(s.state, 'armed');
  s = step(s, { now: new Date(Date.parse(OFP.generated_at) + 12.5 * 3600e3).toISOString(), feedOk: true, pilot: null }).state;
  assert.equal(s.state, 'idle');
  assert.equal(s.ofp, null);
});

test('a new OFP replaces the armed one', () => {
  let s = step({ ...IDLE }, { now: t(0), feedOk: true, pilot: P({}), ofp: OFP }).state;
  const next = { ...OFP, id: '999', callsign: 'ELY100', dest: { ...OFP.dest, icao: 'LICC' } };
  s = step(s, { now: t(10), feedOk: true, pilot: P({ callsign: 'ELY100', arr: 'LICC' }), ofp: next }).state;
  assert.equal(s.state, 'armed');
  assert.equal(s.ofp.id, '999');
});

test('acknowledged OFP is never armed again', () => {
  const { s } = replay([...gate, ...pushTaxi, ...takeoff, ...landing, ...park]);
  const after = acknowledge(s);
  assert.equal(after.state, 'idle');
  assert.equal(after.done_ofp_id, OFP.id);
  const again = step(after, { now: t(30), feedOk: true, pilot: P({}), ofp: OFP }).state;
  assert.equal(again.state, 'idle');
  assert.equal(again.ofp, null);
});

test('arrived waits for the app; moving again soon after means it was a taxi hold', () => {
  const { s } = replay([...gate, ...pushTaxi, ...takeoff, ...landing, ...park]);
  assert.equal(step(s, { now: t(40), feedOk: true, pilot: null }).state.state, 'arrived');
  assert.equal(step(s, { now: t(40), feedOk: true, pilot: P({ gs_kt: 20 }) }).state.state, 'arrived');   // 30 min later: next flight, not ours
  const back = step(s, { now: t(14), feedOk: true, pilot: P({ gs_kt: 12, alt_ft: 134 }) }).state;
  assert.equal(back.state, 'taxi_in');
  assert.equal(back.in_at, null);
});

test('a 2-minute hold on the taxiway is not the gate', () => {
  const hold = [stop, stop, P({ gs_kt: 10, alt_ft: 134 })];
  const { path } = replay([...gate, ...pushTaxi, ...takeoff, ...landing, ...hold, ...park]);
  assert.deepEqual(path, ['armed', 'taxi_out', 'airborne', 'taxi_in', 'arrived']);
});

test('SimBrief is called sparingly', () => {
  assert.equal(wantsOfp({ state: 'idle' }, false, t(10), null), false);          // not connected: never
  assert.equal(wantsOfp({ state: 'idle' }, true, t(10), t(7)), false);
  assert.equal(wantsOfp({ state: 'idle' }, true, t(10), t(5)), true);
  assert.equal(wantsOfp({ state: 'armed' }, true, t(10), t(5)), false);
  assert.equal(wantsOfp({ state: 'airborne' }, true, t(10), null), false);
});

test('OFP summary: fields, units, lbs conversion', () => {
  const raw = {
    params: { request_id: '1', time_generated: '1789891951', units: 'lbs' }, atc: { callsign: 'ELY1' },
    origin: { icao_code: 'LPPT', pos_lat: '38.7', pos_long: '-9.1', elevation: '355' },
    destination: { icao_code: 'LLBG', pos_lat: '32', pos_long: '34.8', elevation: '134' },
    alternate: { icao_code: {} }, general: { route_distance: '2240', gc_distance: '2171' },
    aircraft: { icao_code: 'B738', reg: 'N738PM', max_passengers: '189' },
    weights: { max_tow: '174900', pax_count: '168', freight_added: '1000', bag_weight: '55' },
    times: { sched_out: '1789893900', orig_timezone: '1' },
  };
  const o = summarizeOfp(raw);
  assert.equal(o.weights.mtow_kg, 79333);
  assert.equal(o.weights.freight_kg, 454);
  assert.equal(o.alternate, null);
  assert.equal(o.sched.out, '2026-09-20T08:45:00.000Z');
  assert.equal(o.origin.elev_ft, 355);
  assert.equal(summarizeOfp({}), null);
});

test('signed token: valid, expired, tampered, weak secret', async () => {
  const secret = 'x'.repeat(40), now = 1_800_000_000;
  const tok = await signToken(secret, now + 600);
  assert.equal(await verifyToken(secret, tok, now), true);
  assert.equal(await verifyToken(secret, tok, now + 601), false);
  assert.equal(await verifyToken(secret, tok.slice(0, -1) + (tok.at(-1) === 'A' ? 'B' : 'A'), now), false);
  assert.equal(await verifyToken('y'.repeat(40), tok, now), false);
  assert.equal(await verifyToken('short', tok, now), false);
  assert.equal(await verifyToken(secret, await signToken(secret, now + 7200), now), false);   // too long-lived
});
