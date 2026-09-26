// index.js: D1 + fetch mocked. Once-per-minute guard, and account ids that
// come from the app's settings (POST /v1/config) instead of wrangler.toml.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker, { tick } from '../src/index.js';
import { signToken } from '../src/auth.js';

function fakeDb() {
  const rows = { tracker: null, config: null, events: [] };
  const exec = ({ sql, a }) => {
    if (sql.includes('FROM tracker WHERE')) return { results: rows.tracker ? [rows.tracker] : [] };
    if (sql.includes('FROM config WHERE')) return { results: rows.config ? [rows.config] : [] };
    if (sql.startsWith('INSERT INTO tracker ')) rows.tracker = { data: a[0], ofp_checked_at: a[1] };
    else if (sql.startsWith('INSERT INTO config')) rows.config = { vatsim_cid: a[0], simbrief_id: a[1] };
    else if (sql.startsWith('INSERT INTO tracker_events')) rows.events.push(a);
    return { results: [] };
  };
  const stmt = (sql, a = []) => ({
    sql, a,
    bind: (...b) => stmt(sql, b),
    first: async () => exec({ sql, a }).results[0] ?? null,
    run: async () => exec({ sql, a }),
    all: async () => exec({ sql, a }),
  });
  return { rows, prepare: (sql) => stmt(sql), batch: async (list) => list.map(exec) };
}

const feedWith = (cid) => async () => new Response(JSON.stringify({ general: {}, pilots: cid ? [{ cid, callsign: 'AFR1066', latitude: 45, longitude: 5, altitude: 15000, groundspeed: 370, heading: 120, transponder: '1000', flight_plan: { departure: 'LFPG', arrival: 'LIRQ' } }] : [] }));

test('same minute twice while disconnected counts once', async () => {
  const DB = fakeDb();
  DB.rows.tracker = { data: JSON.stringify({ state: 'disconnected', prev_state: 'airborne', absent_ticks: 3, ofp: { id: '1' } }), ofp_checked_at: null };
  globalThis.fetch = feedWith(null);
  const env = { DB, VATSIM_CID: '1242058' };
  await tick(env, '2026-09-25T15:09:27.000Z');
  await tick(env, '2026-09-25T15:09:39.000Z');
  assert.equal(JSON.parse(DB.rows.tracker.data).absent_ticks, 4);
  await tick(env, '2026-09-25T15:10:27.000Z');
  assert.equal(JSON.parse(DB.rows.tracker.data).absent_ticks, 5);
});

test('the CID saved from the app wins over wrangler.toml', async () => {
  const DB = fakeDb();
  globalThis.fetch = feedWith(1985631);
  await tick({ DB, VATSIM_CID: '1242058' }, '2026-09-26T10:00:00.000Z');
  assert.equal(DB.rows.tracker, null);                              // env CID not in the feed: nothing seen
  DB.rows.config = { vatsim_cid: 1985631, simbrief_id: null };
  await tick({ DB, VATSIM_CID: '1242058' }, '2026-09-26T10:01:00.000Z');
  assert.equal(JSON.parse(DB.rows.tracker.data).last.callsign, 'AFR1066');
});

test('POST /v1/config: token required; refused mid-flight when the CID changes', async () => {
  const secret = 'k'.repeat(48);
  const DB = fakeDb();
  const env = { DB, TRACKER_SECRET: secret, VATSIM_CID: '1242058' };
  const call = async (body, token) => worker.fetch(new Request('https://t/v1/config', {
    method: 'POST', body: JSON.stringify(body), headers: token ? { authorization: `Bearer ${token}` } : {},
  }), env);
  assert.equal((await call({ vatsim_cid: 1985631 })).status, 401);
  const tok = await signToken(secret, Math.floor(Date.now() / 1000) + 600);
  assert.equal((await call({ vatsim_cid: 1985631, simbrief_id: 'MAOR561' }, tok)).status, 200);
  assert.deepEqual(DB.rows.config, { vatsim_cid: 1985631, simbrief_id: 'MAOR561' });
  DB.rows.tracker = { data: JSON.stringify({ state: 'airborne', ofp: { id: '1' } }), ofp_checked_at: null };
  assert.equal((await call({ vatsim_cid: 1242058, simbrief_id: 'MAOR561' }, tok)).status, 409);
  assert.equal((await call({ vatsim_cid: 1985631, simbrief_id: 'OTHER' }, tok)).status, 200);   // same pilot: fine
  assert.equal((await call({ vatsim_cid: 'abc' }, tok)).status, 400);
});
