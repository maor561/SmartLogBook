// SmartLogBook tracker (ADR-024). Every minute: read the VATSIM feed, find our
// CID, maybe fetch the SimBrief OFP, advance the state machine, persist to D1.
// The app reads the live state and acknowledges a finished flight through a
// small token-protected API (ADR-031). Neon is never touched from here.
import { FEED_URL, findPilot, pilotSample } from './feed.js';
import { fetchOfp } from './ofp.js';
import { IDLE, step, acknowledge, wantsOfp } from './machine.js';
import { verifyToken } from './auth.js';

async function load(env) {
  const row = await env.DB.prepare('SELECT data, ofp_checked_at FROM tracker WHERE id = 1').first();
  return row ? { s: { ...IDLE, ...JSON.parse(row.data) }, ofpCheckedAt: row.ofp_checked_at } : { s: { ...IDLE }, ofpCheckedAt: null };
}

async function save(env, s, ofpCheckedAt, now, events = []) {
  const stmts = [env.DB.prepare(
    `INSERT INTO tracker (id, data, ofp_checked_at, updated_at) VALUES (1, ?1, ?2, ?3)
     ON CONFLICT (id) DO UPDATE SET data = ?1, ofp_checked_at = ?2, updated_at = ?3`,
  ).bind(JSON.stringify(s), ofpCheckedAt, now)];
  for (const e of events) {
    stmts.push(env.DB.prepare('INSERT INTO tracker_events (at, from_state, to_state, reason) VALUES (?1, ?2, ?3, ?4)')
      .bind(e.at, e.from, e.to, e.reason));
  }
  await env.DB.batch(stmts);
}

export async function tick(env, now) {
  const { s, ofpCheckedAt } = await load(env);
  // Cloudflare occasionally fires the same minute twice. While a flight is
  // active every tick counts (e.g. the 30-min reconnect window), so process
  // each minute once. Idle ticks are harmless and skip the extra write.
  const minute = now.slice(0, 16);
  if (s.state !== 'idle' && s.last_tick === minute) return { state: s, events: [] };

  let feedOk = true, pilot = null;
  try {
    const res = await fetch(FEED_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const found = findPilot(await res.text(), Number(env.VATSIM_CID));
    pilot = found ? pilotSample(found, now) : null;
  } catch {
    feedOk = false;                                     // feed outage ≠ disconnect (ADR-024)
  }

  const input = { now, feedOk, pilot };
  let checkedAt = ofpCheckedAt;
  if (feedOk && env.SIMBRIEF_ID && wantsOfp(s, Boolean(pilot), now, ofpCheckedAt)) {
    try { input.ofp = await fetchOfp(env.SIMBRIEF_ID); checkedAt = now; } catch { /* SimBrief down: try next time */ }
  }

  const { state, events } = step(s, input);
  if (state.state !== 'idle') state.last_tick = minute;
  // Write only when something happened (ADR-024): a transition, a new sample
  // while connected, an OFP check, or a feed-status change.
  const changed = events.length || pilot || checkedAt !== ofpCheckedAt || JSON.stringify(state) !== JSON.stringify(s);
  if (changed) await save(env, state, checkedAt, now, events);
  return { state, events };
}

// ---------- API

function cors(request, env) {
  const origin = request.headers.get('origin');
  const allowed = (env.APP_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean);
  return origin && allowed.includes(origin)
    ? { 'access-control-allow-origin': origin, 'access-control-allow-headers': 'authorization, content-type', 'access-control-allow-methods': 'GET, POST, OPTIONS', vary: 'origin' }
    : {};
}

const json = (body, status, headers) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers } });

export default {
  async scheduled(event, env) {
    await tick(env, new Date(event.scheduledTime).toISOString());
  },

  async fetch(request, env) {
    const url = new URL(request.url);
    const h = cors(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    if (!url.pathname.startsWith('/v1/')) return new Response('smartlogbook-tracker', { headers: { 'content-type': 'text/plain' } });

    const token = (request.headers.get('authorization') || '').replace(/^Bearer /, '');
    if (!(await verifyToken(env.TRACKER_SECRET, token))) return json({ error: 'unauthorized' }, 401, h);

    if (request.method === 'GET' && url.pathname === '/v1/state') {
      const { s } = await load(env);
      const { results } = await env.DB.prepare('SELECT at, from_state, to_state, reason FROM tracker_events ORDER BY id DESC LIMIT 20').all();
      return json({ tracker: s, events: results, server_time: new Date().toISOString() }, 200, h);
    }

    // The app stored the flight in Neon — tracked, finished manually mid-flight,
    // or an interrupted one the user deleted: reset, and never re-arm this OFP.
    if (request.method === 'POST' && url.pathname === '/v1/ack') {
      const body = await request.json().catch(() => ({}));
      const { s, ofpCheckedAt } = await load(env);
      if (s.state === 'idle') return json({ error: 'nothing to acknowledge (idle)' }, 409, h);
      if (body.ofp_id !== s.ofp?.id) return json({ error: 'ofp_id does not match the tracked flight' }, 409, h);
      const now = new Date().toISOString();
      await env.DB.prepare('DELETE FROM tracker_events').run();   // the flight now lives in Neon
      await save(env, acknowledge(s), ofpCheckedAt, now, [{ at: now, from: s.state, to: 'idle', reason: 'acknowledged by app' }]);
      return json({ ok: true }, 200, h);
    }

    return json({ error: 'not found' }, 404, h);
  },
};
