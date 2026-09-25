import 'server-only';
import { db } from './db';
import { getAirport, nearestAirport, nmBetween } from './airports';
import { latestOfp } from './external';
import { currentFuelPrice } from './eia';
import { getSettings, type Settings } from './settings';
import { hasTracker, trackerState } from './tracker';
import { currentRating } from './analysis-data';
import type { OfpSummary } from './ofp';
import type { Times } from './flight-input';
import type { RateParams } from './rates/params';

// Everything the flight screen needs, derived on the server from the tracker
// (Worker), the latest SimBrief OFP and Neon (sketch s1a, six states).

export type Sample = { lat: number; lon: number; alt_ft: number; gs_kt: number; hdg: number; squawk: string; callsign: string };
export type TrackerDoc = {
  state: 'idle' | 'armed' | 'taxi_out' | 'airborne' | 'taxi_in' | 'disconnected' | 'interrupted' | 'arrived';
  ofp: OfpSummary | null; done_ofp_id: string | null;
  out_at: string | null; off_at: string | null; on_at: string | null; in_at: string | null;
  landing: { lat: number; lon: number } | null; last: Sample | null; last_seen_at: string | null;
  prev_state: string | null; disconnected_at: string | null; joined: string | null;
};

export type Place = { icao: string; name: string | null };
export type RecentFlight = {
  id: number; date: string; origin: string; dest: string; aircraft: string | null;
  blockMin: number | null; fpm: number | null; profitCents: number; source: string; diverted: boolean;
};
export type Base = {
  settings: Settings;
  crew: Place & { since: string | null };
  recent: RecentFlight[];
  month: { label: string; profitCents: number; flights: number; blockMin: number };
  tracker: TrackerDoc | null;
  trackerError: string | null;
};
export type FormView = {
  mode: 'tracked' | 'manual';
  ofp: OfpSummary;
  tracked: Times;                  // what VATSIM measured (locked in the form)
  actual: Place | null;            // where the aircraft actually landed (tracked flights)
  diverted: boolean;
  diversionNm: number | null;
  positioningNm: number | null;
  params: RateParams;
  rateSetId: number;
  fuel: { usdPerKg: number; week: string } | null;
  rating: number | null;           // company rating before this flight (ADR-037); null = still building
  trackerState: TrackerDoc['state'] | null;
  disconnectedAt: string | null;
};

export type FlightView =
  | { kind: 'idle'; base: Base }
  | { kind: 'plan'; base: Base; ofp: OfpSummary; expiresInMin: number; positioningNm: number | null }
  | { kind: 'live' | 'disc'; base: Base; t: TrackerDoc; ofp: OfpSummary }
  | { kind: 'done' | 'manual'; base: Base; form: FormView };

const LIVE = new Set(['armed', 'taxi_out', 'airborne', 'taxi_in']);
const OFP_MAX_AGE_H = 12;

async function crewLocation(home: string): Promise<Place & { since: string | null }> {
  const [last] = await db()`
    SELECT coalesce(dest_actual_icao, dest_planned_icao) AS icao, coalesce(in_at, closed_at) AS at
    FROM flights WHERE status IN ('closed', 'historical')
    ORDER BY coalesce(in_at, closed_at) DESC NULLS LAST, id DESC LIMIT 1`;
  const icao = (last?.icao ?? home).trim();
  const ap = await getAirport(icao);
  return { icao, name: ap?.city ?? ap?.name ?? null, since: last?.at ? new Date(last.at).toISOString() : null };
}

async function recentFlights(): Promise<RecentFlight[]> {
  const rows = await db()`
    SELECT f.id, coalesce(f.in_at, f.closed_at) AS at, f.origin_icao, coalesce(f.dest_actual_icao, f.dest_planned_icao) AS dest,
           f.dest_actual_icao <> f.dest_planned_icao AS diverted, f.aircraft_type, f.block_min, f.fpm, f.source,
           coalesce(sum(l.amount_cents), 0)::bigint AS profit
    FROM flights f LEFT JOIN ledger_lines l ON l.flight_id = f.id
    WHERE f.status IN ('closed', 'historical')
    GROUP BY f.id ORDER BY coalesce(f.in_at, f.closed_at) DESC NULLS LAST, f.id DESC LIMIT 5`;
  return rows.map((r) => ({
    id: r.id, date: new Date(r.at).toISOString(), origin: r.origin_icao.trim(), dest: r.dest.trim(), aircraft: r.aircraft_type,
    blockMin: r.block_min, fpm: r.fpm, profitCents: Number(r.profit), source: r.source, diverted: Boolean(r.diverted),
  }));
}

async function monthSummary() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const [r] = await db()`
    SELECT count(DISTINCT f.id)::int AS flights, coalesce(sum(l.amount_cents), 0)::bigint AS profit,
           (SELECT coalesce(sum(block_min), 0)::int FROM flights WHERE status = 'closed' AND closed_at >= ${start}) AS block
    FROM flights f LEFT JOIN ledger_lines l ON l.flight_id = f.id
    WHERE f.status = 'closed' AND f.closed_at >= ${start}`;
  const label = now.toLocaleDateString('he-IL', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return { label, profitCents: Number(r.profit), flights: r.flights, blockMin: r.block };
}

// Rate version in force at OUT (ADR-021, 025): the newest one created before it.
async function rateSetAt(at: string | null): Promise<{ id: number; params: RateParams }> {
  const when = at ?? new Date().toISOString();
  const [r] = await db()`SELECT id, params FROM rate_sets WHERE created_at <= ${when} ORDER BY id DESC LIMIT 1`;
  if (r) return r as { id: number; params: RateParams };
  const [first] = await db()`SELECT id, params FROM rate_sets ORDER BY id LIMIT 1`;
  return first as { id: number; params: RateParams };
}

// EIA price for the week of OUT; the newest stored week otherwise (ADR-025).
async function fuelAt(at: string | null) {
  const latest = await currentFuelPrice().catch(() => null);
  if (at) {
    const [r] = await db()`SELECT week, usd_per_kg FROM eia_prices WHERE week <= ${at.slice(0, 10)} ORDER BY week DESC LIMIT 1`;
    if (r) return { usdPerKg: Number(r.usd_per_kg), week: new Date(r.week).toISOString().slice(0, 10) };
  }
  return latest ? { usdPerKg: latest.usdPerKg, week: latest.week } : null;
}

async function alreadyLogged(ofpId: string) {
  const [r] = await db()`SELECT 1 FROM flights WHERE ofp_id = ${ofpId}`;
  return Boolean(r);
}

export async function buildForm(ofp: OfpSummary, t: TrackerDoc | null, crew: string): Promise<FormView> {
  const tracked: Times = t && t.ofp?.id === ofp.id
    ? { out: t.out_at, off: t.off_at, on: t.on_at, in: t.in_at }
    : { out: null, off: null, on: null, in: null };
  let actual: Place | null = null, diverted = false, diversionNm: number | null = null;
  if (t?.landing && t.ofp?.id === ofp.id) {
    const ap = await nearestAirport(t.landing.lat, t.landing.lon);
    if (ap) {
      actual = { icao: ap.icao, name: ap.city ?? ap.name };
      if (ap.icao !== ofp.dest.icao) { diverted = true; diversionNm = await nmBetween(ap.icao, ofp.dest.icao); }
    }
  }
  const at = tracked.out ?? tracked.off;
  const [rs, fuel, positioningNm, rating] = await Promise.all([rateSetAt(at), fuelAt(at), nmBetween(crew, ofp.origin.icao), currentRating()]);
  const mode = t && t.ofp?.id === ofp.id && t.state === 'arrived' && !t.joined && tracked.out && tracked.off && tracked.on && tracked.in ? 'tracked' : 'manual';
  return {
    mode, ofp, tracked, actual, diverted, diversionNm, positioningNm,
    params: rs.params, rateSetId: rs.id, fuel, rating,
    trackerState: t?.state ?? null, disconnectedAt: t?.disconnected_at ?? null,
  };
}

export async function getFlightView(opts: { manual?: boolean } = {}): Promise<FlightView> {
  const settings = await getSettings();
  const [crew, recent, month] = await Promise.all([crewLocation(settings.homeBaseIcao), recentFlights(), monthSummary()]);

  let tracker: TrackerDoc | null = null, trackerError: string | null = null;
  if (hasTracker()) {
    try { tracker = (await trackerState()).tracker as TrackerDoc; } catch (e) { trackerError = (e as Error).message; }
  } else trackerError = 'TRACKER_SECRET לא מוגדר';
  const base: Base = { settings, crew, recent, month, tracker, trackerError };

  // Tracker owns the flight once it matched an OFP.
  if (tracker && tracker.state !== 'idle' && tracker.ofp) {
    const ofp = tracker.ofp;
    if (await alreadyLogged(ofp.id)) return { kind: 'idle', base };   // closed; ack still pending
    if (tracker.state === 'arrived' || tracker.state === 'interrupted' || opts.manual) {
      const form = await buildForm(ofp, tracker, crew.icao);
      return { kind: form.mode === 'tracked' && !opts.manual ? 'done' : 'manual', base, form };
    }
    if (LIVE.has(tracker.state)) return { kind: 'live', base, t: tracker, ofp };
    if (tracker.state === 'disconnected') return { kind: 'disc', base, t: tracker, ofp };
  }

  // Otherwise: is there a fresh, unflown plan in SimBrief?
  const ofp = settings.simbriefId ? await latestOfp(settings.simbriefId) : null;
  const age = ofp?.generated_at ? (Date.now() - Date.parse(ofp.generated_at)) / 3600e3 : Infinity;
  const usable = ofp && age <= OFP_MAX_AGE_H && ofp.id !== tracker?.done_ofp_id && !(await alreadyLogged(ofp.id));
  if (!usable) return { kind: 'idle', base };
  if (opts.manual) return { kind: 'manual', base, form: await buildForm(ofp, null, crew.icao) };
  const expiresInMin = Math.max(0, Math.round((OFP_MAX_AGE_H - age) * 60));
  return { kind: 'plan', base, ofp, expiresInMin, positioningNm: await nmBetween(crew.icao, ofp.origin.icao) };
}
