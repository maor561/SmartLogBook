// index.js tick(): D1 + fetch mocked. Checks the once-per-minute guard.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tick } from '../src/index.js';

function fakeDb() {
  const rows = { tracker: null, events: [] };
  const stmt = (sql) => ({
    bind: (...a) => ({ sql, a }),
    first: async () => (sql.startsWith('SELECT data') && rows.tracker ? rows.tracker : null),
  });
  return {
    rows,
    prepare: stmt,
    batch: async (list) => {
      for (const { sql, a } of list) {
        if (sql.startsWith('INSERT INTO tracker ')) rows.tracker = { data: a[0], ofp_checked_at: a[1] };
        else rows.events.push(a);
      }
    },
  };
}

test('same minute twice while disconnected counts once', async () => {
  const DB = fakeDb();
  DB.rows.tracker = { data: JSON.stringify({ state: 'disconnected', prev_state: 'airborne', absent_ticks: 3, ofp: { id: '1' } }), ofp_checked_at: null };
  globalThis.fetch = async () => new Response('{"general":{},"pilots":[]}');
  const env = { DB, VATSIM_CID: '1242058' };
  await tick(env, '2026-09-25T15:09:27.000Z');
  await tick(env, '2026-09-25T15:09:39.000Z');
  assert.equal(JSON.parse(DB.rows.tracker.data).absent_ticks, 4);
  await tick(env, '2026-09-25T15:10:27.000Z');
  assert.equal(JSON.parse(DB.rows.tracker.data).absent_ticks, 5);
});
