// Replays a real VATSIM recording (DLH314 EDDF→LFPG, 2026-09-26, sampled every
// 15 s) through the machine exactly as the cron sees it: one sample per minute
// at :41. Expected times are what the live Worker logged that day, within the
// ±1 min accuracy of ADR-024 — and the two mid-taxi holds must not end the flight.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { IDLE, step } from '../src/machine.js';

const REC = readFileSync(new URL('./fixtures/dlh314-eddf-lfpg.jsonl', import.meta.url), 'utf8').trim().split('\n').map(JSON.parse);
const OFP = {
  id: '187xxx', generated_at: '2026-09-26T06:40:00.000Z', callsign: 'DLH314',
  origin: { icao: 'EDDF', lat: 50.0333, lon: 8.5706, elev_ft: 364 },
  dest: { icao: 'LFPG', lat: 49.0097, lon: 2.5479, elev_ft: 392 },
};
const mins = (a, b) => Math.abs(Date.parse(a) - Date.parse(b)) / 60000;

test('real flight: gate → pushback → takeoff → landing → gate, holds ignored', () => {
  let s = { ...IDLE };
  const path = [];
  const start = Date.parse('2026-09-26T06:49:41Z'), end = Date.parse(REC.at(-1).at);
  for (let t = start; t <= end; t += 60000) {
    const now = new Date(t).toISOString();
    const sample = [...REC].reverse().find((r) => Date.parse(r.at) <= t);
    const pilot = sample && sample.connected !== false ? { ...sample, dep: 'EDDF', arr: 'LFPG' } : null;
    const r = step(s, { now, feedOk: true, pilot, ...(t === start ? { ofp: OFP } : {}) });
    s = r.state;
    path.push(...r.events.map((e) => e.to));
  }
  assert.deepEqual(path, ['armed', 'taxi_out', 'airborne', 'taxi_in', 'arrived']);
  assert.ok(mins(s.off_at, '2026-09-26T06:59:16Z') <= 1, `OFF ${s.off_at}`);
  assert.ok(mins(s.on_at, '2026-09-26T07:46:50Z') <= 1, `ON ${s.on_at}`);
  assert.ok(mins(s.in_at, '2026-09-26T07:56:03Z') <= 1, `IN ${s.in_at}`);
});
