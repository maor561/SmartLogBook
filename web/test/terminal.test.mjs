// Terminal simulation (ADR-053): deterministic per OFP, passengers conserved,
// boarding before PUSHBACK, and the map puts everyone somewhere sensible.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulate, stateAt, summary, sizeOf, SI, MIN } from '../src/lib/terminal/sim.ts';
import { layout, place, MAP_W, MAP_H } from '../src/lib/terminal/map.ts';

const OUT = Date.UTC(2026, 8, 26, 12, 50);
const base = { seed: '187637362', pax: 185, bags: 185, seats: 189, outMs: OUT, size: 'large' };

test('same OFP, same simulation; another OFP, another one', () => {
  const a = simulate(base), b = simulate(base), c = simulate({ ...base, seed: '187637363' });
  assert.deepEqual(a.pax.map((p) => p.seated), b.pax.map((p) => p.seated));
  assert.notDeepEqual(a.pax.map((p) => p.arr), c.pax.map((p) => p.arr));
});

test('everyone is somewhere, at every moment', () => {
  const sim = simulate(base);
  for (let t = sim.start; t <= sim.end; t += 5 * MIN) {
    const { S, pos } = stateAt(sim, t);
    const arrived = sim.pax.filter((p) => p.arr <= t).length;
    assert.equal(pos.filter(Boolean).length, arrived, `at ${new Date(t).toISOString()}`);
    const inside = S.reduce((n, x) => n + x.queue.length + x.serve + x.dwell + x.walking, 0);
    assert.equal(inside, arrived);
  }
});

test('a large airport boards a full B738 before PUSHBACK', () => {
  const sim = simulate(base), s = summary(sim);
  assert.equal(s.boarded, 185);
  assert.ok(sim.doorClose < OUT, 'door closes before PUSHBACK');
  const { S } = stateAt(sim, OUT);
  assert.equal(S[SI.aircraft].dwell, 185);
});

test('joining 40 minutes before PUSHBACK: the terminal is already mostly airside', () => {
  const sim = simulate(base), { S } = stateAt(sim, OUT - 40 * MIN);
  assert.ok(sim.pax.every((p) => p.arr <= OUT - 40 * MIN || p.late), 'only late passengers still arriving');
  assert.equal(S[SI.checkin].queue.length + S[SI.checkin].serve, 0);
  assert.ok(S[SI.gate].dwell > 100);
});

test('queues are FIFO per station and nobody is served twice at once', () => {
  const sim = simulate(base);
  for (const st of [SI.checkin, SI.security, SI.passport]) {
    const steps = sim.pax.flatMap((p) => p.steps.filter((s) => s.st === st));
    const byServer = new Map();
    for (const s of steps) { if (!byServer.has(s.server)) byServer.set(s.server, []); byServer.get(s.server).push(s); }
    for (const list of byServer.values()) {
      list.sort((a, b) => a.start - b.start);
      for (let k = 1; k < list.length; k++) assert.ok(list[k].start >= list[k - 1].end - 1e-6);
    }
    assert.ok(steps.every((s) => s.start >= s.ready));
  }
});

test('airport size comes from OurAirports type; unknown is medium', () => {
  assert.equal(sizeOf('large_airport'), 'large');
  assert.equal(sizeOf('small_airport'), 'small');
  assert.equal(sizeOf(null), 'medium');
  assert.ok(simulate({ ...base, size: 'small' }).servers.checkin < simulate(base).servers.checkin);
});

test('odd inputs: no bags, more passengers than seats, empty flight', () => {
  const noBags = simulate({ ...base, bags: 0 });
  assert.ok(noBags.pax.every((p) => !p.steps.some((s) => s.st === SI.bagdrop)));
  const full = simulate({ ...base, pax: 200, seats: 180 });
  assert.equal(new Set(full.pax.map((p) => `${p.seat.r}-${p.seat.c}`)).size, 200);
  const empty = simulate({ ...base, pax: 0 });
  assert.equal(empty.pax.length, 0);
  assert.equal(summary(empty).boarded, 0);
});

test('the map places every passenger inside the picture', () => {
  for (const size of ['large', 'medium', 'small']) {
    const sim = simulate({ ...base, size }), L = layout(sim);
    for (let t = sim.start; t <= sim.end; t += 3 * MIN) {
      const { S, pos } = stateAt(sim, t);
      const qIdx = new Map(); S.forEach((x) => x.queue.forEach((q, k) => qIdx.set(q.p.i, k)));
      sim.pax.forEach((p) => {
        const w = pos[p.i]; if (!w) return;
        const { xy } = place(L, p, w, qIdx.get(p.i) ?? 0);
        assert.ok(xy[0] >= 0 && xy[0] <= MAP_W && xy[1] >= 0 && xy[1] <= MAP_H, `${size} ${w.kind} ${xy}`);
      });
    }
  }
});
