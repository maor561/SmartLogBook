// SmartLogBook tracker — WP0 spike.
// Runs the real per-minute path (fetch feed → targeted CID lookup) so we can
// read the actual CPU time per invocation in the Cloudflare dashboard before
// building the state machine on top of it (WP4, ADR-024).
import { FEED_URL, findPilot, feedUpdatedAt, pilotSample } from './feed.js';

async function probe(env) {
  const at = new Date().toISOString();
  let text;
  try {
    const res = await fetch(FEED_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    text = await res.text();
  } catch (e) {
    return { at, feed_error: String(e.message || e) };   // feed outage ≠ pilot disconnect (ADR-024)
  }
  const cid = Number(env.VATSIM_CID) || null;
  const pilot = cid ? findPilot(text, cid) : null;
  return {
    at,
    feed_ts: feedUpdatedAt(text),
    feed_kb: Math.round(text.length / 1024),
    cid,
    connected: Boolean(pilot),
    sample: pilot ? pilotSample(pilot, at) : null,
  };
}

export default {
  async scheduled(_event, env) {
    console.log(JSON.stringify({ spike: 'wp0', ...(await probe(env)) }));
  },

  async fetch(request, env) {
    // Spike-only convenience endpoint. The real API (WP4) is behind a signed token (ADR-031).
    if (new URL(request.url).pathname === '/probe') return Response.json(await probe(env));
    return new Response('smartlogbook-tracker · WP0 spike', { headers: { 'content-type': 'text/plain; charset=utf-8' } });
  },
};
