// WP0 · local benchmark of the targeted CID lookup against the live VATSIM feed.
// This is a proxy for Workers CPU time (same V8); the real number comes from the
// Cloudflare dashboard once the spike Worker is deployed.
//   node tools/bench-feed.mjs
import { FEED_URL, findPilot } from '../tracker/src/feed.js';

const res = await fetch(FEED_URL);
const text = await res.text();
const full = JSON.parse(text);
const pilots = full.pilots;
const ms = (fn, runs = 30) => {
  let best = Infinity;
  for (let i = 0; i < runs; i++) { const t = process.hrtime.bigint(); fn(); best = Math.min(best, Number(process.hrtime.bigint() - t) / 1e6); }
  return best.toFixed(2);
};
const first = pilots[0].cid, mid = pilots[Math.floor(pilots.length / 2)].cid, last = pilots[pilots.length - 1].cid;
console.log(`feed: ${(text.length / 1024).toFixed(0)} KB · ${pilots.length} pilots · ${full.prefiles?.length ?? 0} prefiles · updated ${full.general.update_timestamp}`);
console.log(`JSON.parse (whole feed):   ${ms(() => JSON.parse(text))} ms`);
console.log(`findPilot, first pilot:    ${ms(() => findPilot(text, first))} ms`);
console.log(`findPilot, middle pilot:   ${ms(() => findPilot(text, mid))} ms`);
console.log(`findPilot, last pilot:     ${ms(() => findPilot(text, last))} ms`);
console.log(`findPilot, not connected:  ${ms(() => findPilot(text, 9999999))} ms   (the common case: no active flight)`);
console.log(`sanity: last pilot found = ${findPilot(text, last)?.callsign}`);
