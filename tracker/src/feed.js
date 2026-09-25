// Targeted lookup of one pilot inside the VATSIM v3 data feed (ADR-024).
//
// The feed is ~1.2 MB of JSON and the Workers Free plan allows 10 ms of CPU per
// cron run. JSON.parse of the whole feed is ~2 ms locally, which is fine on a
// quiet night but leaves little headroom on event days. Instead we locate the
// CID with a regex and parse only the one object that contains it.
//
// A CID can appear in three arrays: `pilots` (connected pilots), `controllers`
// (and `atis`), and `prefiles` (filed but not connected). Only a `pilots` entry
// has a position and `groundspeed`, so that is what we accept.

export const FEED_URL = 'https://data.vatsim.net/v3/vatsim-data.json';

/**
 * Walks forward from an opening brace and returns the index just past its
 * matching closing brace. String-aware, so braces inside remarks or routes
 * (e.g. "RMK/{TCAS}") don't break the count. Returns -1 on malformed input.
 */
export function objectEnd(text, start) {
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    if (inString) {
      if (ch === 92 /* \ */) i++;              // skip the escaped character
      else if (ch === 34 /* " */) inString = false;
      continue;
    }
    if (ch === 34) inString = true;
    else if (ch === 123 /* { */) depth++;
    else if (ch === 125 /* } */) {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

/**
 * Finds the connected pilot with the given CID in the raw feed text.
 * Returns the parsed pilot object, or null when the CID is not flying.
 */
export function findPilot(text, cid) {
  const re = new RegExp(`"cid"\\s*:\\s*${Number(cid)}\\s*[,}]`, 'g');
  let m;
  while ((m = re.exec(text)) !== null) {
    // "cid" is the first key of every entry, so the entry starts at the
    // nearest opening brace before it.
    const start = text.lastIndexOf('{', m.index);
    if (start < 0) continue;
    const end = objectEnd(text, start);
    if (end < 0) continue;
    let obj;
    try { obj = JSON.parse(text.slice(start, end)); } catch { continue; }
    if (obj && obj.cid === Number(cid) && typeof obj.groundspeed === 'number' && typeof obj.latitude === 'number') {
      return obj;
    }
  }
  return null;
}

/** Feed timestamp without parsing the whole document (for staleness checks). */
export function feedUpdatedAt(text) {
  const m = /"update_timestamp"\s*:\s*"([^"]+)"/.exec(text);
  return m ? m[1] : null;
}

/** The subset of a pilot entry the tracker needs. */
export function pilotSample(p, at = new Date().toISOString()) {
  return {
    at,
    callsign: p.callsign,
    lat: p.latitude,
    lon: p.longitude,
    alt_ft: p.altitude,
    gs_kt: p.groundspeed,
    hdg: p.heading,
    squawk: p.transponder,
    dep: p.flight_plan?.departure ?? null,
    arr: p.flight_plan?.arrival ?? null,
    logon: p.logon_time,
    last_updated: p.last_updated,
  };
}
