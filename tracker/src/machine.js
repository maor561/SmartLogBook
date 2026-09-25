// Flight lifecycle state machine (ADR-020, 024). Pure: one call per cron tick,
// no I/O, no clock — `now` comes in with the input. index.js does the fetching.
//
//   idle ──match──► armed ──move──► taxi_out ──takeoff──► airborne ──slow──► taxi_in ──stop──► arrived
//                                      │                     │                  │
//                                      └──── no pilot ───────┴──► disconnected ─┘ (taxi_in + gone = IN)
//                                                                 │ back → previous state
//                                                                 └ 30 feed-OK ticks → interrupted
//
// Thresholds are DEFAULTS until a real recorded flight calibrates them (WP0 item 2).

export const DEFAULTS = {
  outMoveNm: 0.03,        // ≈55 m from the gate position = pushback/taxi started
  outGsKt: 3,
  offAglFt: 150,          // airborne: above field + 150 ft while fast …
  offGsKt: 60,
  offGsAloneKt: 160,      // … or simply this fast (no aircraft taxis at 160 kt)
  onGsKt: 40,             // after airborne, slower than this = on the ground (ON)
  inGsKt: 1,              // stopped …
  inTicks: 2,             // … for this many consecutive minutes = IN
  armRadiusNm: 5,         // must be on the ground this close to the OFP origin to arm
  graceTicks: 30,         // ADR-020: 30 minutes to reconnect
  ofpMaxAgeH: 12,         // ADR-020: an unflown plan expires
};

export const IDLE = Object.freeze({
  state: 'idle', ofp: null, done_ofp_id: null,
  out_at: null, off_at: null, on_at: null, in_at: null,
  gate: null, landing: null, last: null, last_seen_at: null,
  prev_state: null, absent_ticks: 0, disconnected_at: null,
  stopped_ticks: 0, stopped_since: null, feed_error_since: null, joined: null, last_tick: null,
});

const R_NM = 3440.065, rad = (d) => (d * Math.PI) / 180;
export function distNm(lat1, lon1, lat2, lon2) {
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 2 * R_NM * Math.asin(Math.min(1, Math.sqrt(a)));
}

const hoursBetween = (a, b) => (Date.parse(b) - Date.parse(a)) / 3600e3;

export function ofpFresh(ofp, now, cfg = DEFAULTS) {
  return Boolean(ofp) && hoursBetween(ofp.generated_at, now) <= cfg.ofpMaxAgeH;
}

// Same flight? Filed route matches the OFP, or the callsign does (ADR-024).
export function matches(pilot, ofp) {
  const route = pilot.dep === ofp.origin.icao && pilot.arr === ofp.dest.icao;
  const cs = Boolean(ofp.callsign) && pilot.callsign?.toUpperCase() === ofp.callsign.toUpperCase();
  return route || cs;
}

function isAirborne(p, fieldElevFt, cfg) {
  const agl = p.alt_ft - (fieldElevFt ?? 0);
  return p.gs_kt >= cfg.offGsAloneKt || (p.gs_kt >= cfg.offGsKt && agl >= cfg.offAglFt);
}

/**
 * @param s      current state (IDLE shape)
 * @param input  { now: ISO, feedOk: boolean, pilot: sample|null, ofp?: summary|null }
 *               `ofp` is present only on ticks where index.js fetched SimBrief.
 * @returns { state, events: [{ at, from, to, reason }] }
 */
export function step(s, input, cfg = DEFAULTS) {
  const { now, feedOk, pilot } = input;
  const next = { ...s };
  const events = [];
  const go = (to, reason) => { events.push({ at: now, from: next.state, to, reason }); next.state = to; };

  // Feed outage ≠ pilot disconnect (ADR-024): freeze everything, count nothing.
  if (!feedOk) {
    next.feed_error_since ??= now;
    return { state: next, events };
  }
  next.feed_error_since = null;

  // A new plan replaces an unflown one (ADR-020).
  if (input.ofp !== undefined && (next.state === 'idle' || next.state === 'armed')) {
    const o = input.ofp;
    const usable = o && o.id !== next.done_ofp_id;
    if (usable && o.id !== next.ofp?.id) {
      if (next.state === 'armed') go('idle', 'new OFP replaces the armed one');
      next.ofp = o;
    } else if (!o && next.state === 'idle') next.ofp = null;
  }

  // An unflown plan expires after 12 h.
  if ((next.state === 'idle' || next.state === 'armed') && next.ofp && !ofpFresh(next.ofp, now, cfg)) {
    if (next.state === 'armed') go('idle', 'OFP expired');
    next.ofp = null; next.gate = null;
  }

  run(next, pilot, now, cfg, go);

  if (pilot) { next.last = pilot; next.last_seen_at = now; }
  return { state: next, events };
}

function disconnect(s, now, go) {
  s.prev_state = s.state;
  s.disconnected_at = now;
  s.absent_ticks = 1;
  go('disconnected', 'pilot not in feed');
}

function run(s, p, now, cfg, go) {
  switch (s.state) {
    case 'idle': {
      if (!p || !s.ofp || !matches(p, s.ofp)) return;
      const o = s.ofp.origin;
      if (isAirborne(p, o.elev_ft, cfg)) {
        // Joined mid-flight: tracked from here, OUT/OFF missing → a "partial" flight (ADR-019).
        s.joined = 'airborne';
        go('airborne', 'matched OFP while already flying');
      } else if (distNm(p.lat, p.lon, o.lat, o.lon) <= cfg.armRadiusNm) {
        s.gate = { lat: p.lat, lon: p.lon };
        go('armed', `matched OFP ${s.ofp.callsign ?? ''} at ${o.icao}`.trim());
      }
      return;
    }
    case 'armed': {
      if (!p) return;                               // not flown yet: just waits (or expires)
      if (isAirborne(p, s.ofp.origin.elev_ft, cfg)) {
        s.joined = 'airborne';
        go('airborne', 'airborne without a seen taxi');
        s.off_at = now;
        return;
      }
      const moved = distNm(p.lat, p.lon, s.gate.lat, s.gate.lon) >= cfg.outMoveNm;
      if (moved || p.gs_kt >= cfg.outGsKt) { s.out_at = now; go('taxi_out', 'left the gate'); }
      return;
    }
    case 'taxi_out': {
      if (!p) return disconnect(s, now, go);
      if (isAirborne(p, s.ofp.origin.elev_ft, cfg)) { s.off_at = now; go('airborne', 'takeoff'); }
      return;
    }
    case 'airborne': {
      if (!p) return disconnect(s, now, go);
      if (p.gs_kt < cfg.onGsKt) {
        s.on_at = now;
        s.landing = { lat: p.lat, lon: p.lon };
        s.stopped_ticks = 0; s.stopped_since = null;
        go('taxi_in', 'landed');
        run(s, p, now, cfg, go);                    // may already be stopped this minute
      }
      return;
    }
    case 'taxi_in': {
      if (!p) { s.in_at = s.last_seen_at ?? now; go('arrived', 'disconnected after landing = IN'); return; }
      if (p.gs_kt >= cfg.offGsKt) { s.on_at = null; s.landing = null; go('airborne', 'took off again'); return; }
      if (p.gs_kt < cfg.inGsKt) {
        s.stopped_since ??= now;
        s.stopped_ticks += 1;
        if (s.stopped_ticks >= cfg.inTicks) { s.in_at = s.stopped_since; go('arrived', 'parked'); }
      } else { s.stopped_ticks = 0; s.stopped_since = null; }
      return;
    }
    case 'disconnected': {
      if (p) {
        const back = s.prev_state;
        s.prev_state = null; s.absent_ticks = 0; s.disconnected_at = null;
        go(back, 'reconnected');
        run(s, p, now, cfg, go);
        return;
      }
      s.absent_ticks += 1;
      if (s.absent_ticks >= cfg.graceTicks) go('interrupted', `no reconnect within ${cfg.graceTicks} min`);
      return;
    }
    default: return;                                // arrived / interrupted: wait for the app (ack)
  }
}

// After the app has stored the flight (or deleted an interrupted one): forget
// it, and never re-arm the same OFP.
export function acknowledge(s) {
  return { ...IDLE, done_ofp_id: s.ofp?.id ?? s.done_ofp_id };
}

// When should index.js call SimBrief this tick? Only when a plan could change
// something: connected and idle (every 5 min), or armed (every 10 min).
export function wantsOfp(s, pilotConnected, now, lastCheck) {
  const since = lastCheck ? (Date.parse(now) - Date.parse(lastCheck)) / 60e3 : Infinity;
  if (s.state === 'idle') return pilotConnected && since >= 5;
  if (s.state === 'armed') return since >= 10;
  return false;
}
