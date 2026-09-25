// WP0 · records one real VATSIM flight so the phase-detection thresholds
// (ADR-020) can be tuned on real data, and the file replayed later as a test
// fixture for the tracker (WP4). Run it on any machine during the flight:
//
//   node tools/record-flight.mjs --cid 1512345
//
// Samples every 15 s (the feed's refresh rate) into recordings/<cid>-<date>.jsonl.
// Stops by itself 15 minutes after you disconnect, or with Ctrl+C.
// This is a test tool only: the product stores no position track (ADR-022).
import { mkdirSync, appendFileSync } from 'node:fs';
import { FEED_URL, findPilot, feedUpdatedAt, pilotSample } from '../tracker/src/feed.js';

const arg = (name) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : undefined; };
const cid = Number(arg('cid'));
if (!cid) { console.error('usage: node tools/record-flight.mjs --cid <VATSIM CID>'); process.exit(1); }

const INTERVAL_MS = 15_000, STOP_AFTER_GONE_MS = 15 * 60_000;
mkdirSync('recordings', { recursive: true });
const file = `recordings/${cid}-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '')}.jsonl`;
let lastFeedTs = null, seenOnce = false, goneSince = null;

const line = (s) => `${s.at.slice(11, 19)}Z  ${String(s.callsign).padEnd(9)} ${String(s.gs_kt).padStart(3)} kt  ${String(s.alt_ft).padStart(5)} ft  hdg ${String(s.hdg).padStart(3)}  ${s.dep ?? '----'}→${s.arr ?? '----'}`;

async function tick() {
  const at = new Date().toISOString();
  let text;
  try {
    const res = await fetch(FEED_URL, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    text = await res.text();
  } catch (e) {
    // A feed outage is not a disconnect (ADR-024) — record it as such.
    appendFileSync(file, JSON.stringify({ at, feed_error: String(e.message || e) }) + '\n');
    console.log(`${at.slice(11, 19)}Z  feed error: ${e.message || e}`);
    return;
  }
  const feedTs = feedUpdatedAt(text);
  if (feedTs === lastFeedTs) return;          // same snapshot as last time
  lastFeedTs = feedTs;

  const p = findPilot(text, cid);
  if (p) {
    seenOnce = true; goneSince = null;
    const s = { ...pilotSample(p, at), feed_ts: feedTs };
    appendFileSync(file, JSON.stringify(s) + '\n');
    console.log(line(s));
  } else {
    appendFileSync(file, JSON.stringify({ at, feed_ts: feedTs, connected: false }) + '\n');
    if (seenOnce) {
      goneSince ??= Date.now();
      console.log(`${at.slice(11, 19)}Z  not connected (${Math.round((Date.now() - goneSince) / 60000)} min)`);
      if (Date.now() - goneSince > STOP_AFTER_GONE_MS) { console.log(`\ndone → ${file}`); process.exit(0); }
    } else {
      console.log(`${at.slice(11, 19)}Z  waiting for CID ${cid} to connect…`);
    }
  }
}

console.log(`recording CID ${cid} → ${file}  (Ctrl+C to stop)`);
await tick();
setInterval(tick, INTERVAL_MS);
