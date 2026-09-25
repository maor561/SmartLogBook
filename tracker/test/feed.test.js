import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findPilot, objectEnd, feedUpdatedAt } from '../src/feed.js';

const pilot = (cid, extra = {}) => ({
  cid, name: 'Test', callsign: 'SLB351', latitude: 32.0, longitude: 34.8, altitude: 36000,
  groundspeed: 452, transponder: '4721', heading: 297, last_updated: '2026-09-25T14:00:00Z',
  flight_plan: { departure: 'LLBG', arrival: 'LGAV', remarks: 'RMK/{TCAS} "quoted" \\ back' }, ...extra,
});
const feed = (o) => JSON.stringify({ general: { update_timestamp: '2026-09-25T14:00:15Z' }, ...o }, null, 1);

test('finds a connected pilot by CID', () => {
  const text = feed({ pilots: [pilot(111), pilot(1512345), pilot(222)], controllers: [], prefiles: [] });
  const p = findPilot(text, 1512345);
  assert.equal(p.cid, 1512345);
  assert.equal(p.groundspeed, 452);
  assert.equal(p.flight_plan.arrival, 'LGAV');
});

test('returns null when the CID is not connected', () => {
  assert.equal(findPilot(feed({ pilots: [pilot(111)], prefiles: [] }), 1512345), null);
});

test('ignores a prefile (filed but not connected) with the same CID', () => {
  const prefile = { cid: 1512345, name: 'Test', callsign: 'SLB351', flight_plan: { departure: 'LLBG' }, last_updated: 'x' };
  assert.equal(findPilot(feed({ pilots: [pilot(111)], prefiles: [prefile] }), 1512345), null);
});

test('ignores a controller entry with the same CID', () => {
  const ctl = { cid: 1512345, callsign: 'LLBG_TWR', frequency: '118.100', facility: 4 };
  const text = feed({ pilots: [pilot(111)], controllers: [ctl], prefiles: [] });
  assert.equal(findPilot(text, 1512345), null);
});

test('does not match a CID that is a prefix of another CID', () => {
  const text = feed({ pilots: [pilot(15123456)], prefiles: [] });
  assert.equal(findPilot(text, 1512345), null);
});

test('braces and escaped quotes inside strings do not break object scanning', () => {
  const s = '{"a":"x}{\\"}","b":{"c":1}} trailing';
  assert.equal(objectEnd(s, 0), s.indexOf(' trailing'));
});

test('works on compact (non-pretty) JSON too', () => {
  const text = JSON.stringify({ pilots: [pilot(111), pilot(1512345)], prefiles: [] });
  assert.equal(findPilot(text, 1512345).cid, 1512345);
});

test('reads the feed timestamp without a full parse', () => {
  assert.equal(feedUpdatedAt(feed({ pilots: [] })), '2026-09-25T14:00:15Z');
});
