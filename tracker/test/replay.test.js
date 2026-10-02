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

// The air part (ADR-061), on the same recording: the sign goes off climbing through 10,000 ft,
// the aircraft levels at FL240, the descent starts at 07:25 and the sign comes back on at 07:36.
test('real flight: seat-belt sign, top of climb, top of descent and the steepest rates', () => {
  let s = { ...IDLE };
  const start = Date.parse('2026-09-26T06:49:41Z'), end = Date.parse(REC.at(-1).at);
  for (let t = start; t <= end; t += 60000) {
    const sample = [...REC].reverse().find((r) => Date.parse(r.at) <= t);
    const pilot = sample && sample.connected !== false ? { ...sample, dep: 'EDDF', arr: 'LFPG' } : null;
    s = step(s, { now: new Date(t).toISOString(), feedOk: true, pilot, ...(t === start ? { ofp: OFP } : {}) }).state;
  }
  const a = s.air;
  assert.ok(mins(a.belt_off_at, '2026-09-26T07:02:41Z') <= 1, `belt off ${a.belt_off_at}`);
  assert.ok(mins(a.toc_at, '2026-09-26T07:07:41Z') <= 1.5, `TOC ${a.toc_at}`);
  assert.ok(mins(a.tod_at, '2026-09-26T07:25:41Z') <= 1, `TOD ${a.tod_at}`);
  assert.ok(mins(a.belt_on_at, '2026-09-26T07:36:41Z') <= 1, `belt on ${a.belt_on_at}`);
  assert.ok(a.max_climb_fpm > 3800 && a.max_climb_fpm < 4400, `climb ${a.max_climb_fpm}`);
  assert.ok(a.max_descent_fpm > 1600 && a.max_descent_fpm < 1900, `descent ${a.max_descent_fpm}`);
  assert.ok(a.top_alt_ft > 24000 && a.top_alt_ft < 24500);
});
