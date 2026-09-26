import 'server-only';
import { db } from './db';
import { nmBetween } from './airports';
import { compute } from './engine';
import { toEngineInput, type Draft, type Times } from './flight-input';
import type { OfpSummary } from './ofp';
import type { RateParams } from './rates/params';
import type { LogFlight } from './logbook-filter';

// Logbook data (WP6). A single user logs a few hundred flights at most, so the
// whole logbook is sent once and filtered in the browser (ADR-023).

export type ApPoint = { lat: number; lon: number; name: string | null };

const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : null);
const trim = (v: unknown) => (typeof v === 'string' ? v.trim() : null);

export async function loadLogbook(): Promise<{ flights: LogFlight[]; airports: Record<string, ApPoint> }> {
  const rows = await db()`
    SELECT f.*, coalesce(sum(l.amount_cents), 0)::bigint AS profit,
           coalesce(json_agg(json_build_object('code', l.code, 'cents', l.amount_cents, 'source', l.source) ORDER BY l.id)
             FILTER (WHERE l.id IS NOT NULL), '[]') AS lines
    FROM flights f LEFT JOIN ledger_lines l ON l.flight_id = f.id
    WHERE f.status IN ('closed', 'historical')
    GROUP BY f.id
    ORDER BY coalesce(f.in_at, f.closed_at) DESC NULLS LAST, f.id DESC`;

  const flights: LogFlight[] = rows.map((r) => ({
    id: r.id,
    date: iso(r.in_at ?? r.closed_at ?? r.created_at)!,
    callsign: r.callsign,
    origin: trim(r.origin_icao)!,
    dest: trim(r.dest_actual_icao ?? r.dest_planned_icao)!,
    plannedDest: trim(r.dest_planned_icao)!,
    aircraft: r.aircraft_type,
    reg: r.registration,
    source: r.source,
    timesSource: trim(r.times_source),
    times: { out: iso(r.out_at), off: iso(r.off_at), on: iso(r.on_at), in: iso(r.in_at) },
    sched: { out: iso(r.sched_out), off: iso(r.sched_off), on: iso(r.sched_on), in: iso(r.sched_in) },
    blockMin: r.block_min ?? r.legacy_planned_air_min ?? null,
    airMin: r.air_min ?? r.legacy_planned_air_min ?? null,
    fpm: r.fpm,
    pax: r.pax,
    seats: r.seats,
    cargoKg: r.cargo_kg,
    distanceNm: r.route_distance_nm,
    profitCents: Number(r.profit),
    lines: (r.lines as { code: string; cents: number; source: string }[]).map((l) => ({ ...l, cents: Number(l.cents) })),
    rateSetId: r.rate_set_id,
    closedAt: iso(r.closed_at),
    editedAt: iso(r.edited_at),
    crewFrom: trim(r.crew_location_icao),
    editable: r.status === 'closed' && Boolean(r.ofp_doc),
  }));

  const codes = [...new Set(flights.flatMap((f) => [f.origin, f.dest, f.plannedDest]))];
  const aps = codes.length ? await db()`SELECT icao, lat, lon, coalesce(city, name) AS name FROM airports WHERE icao = ANY(${codes})` : [];
  const airports = Object.fromEntries(aps.map((a) => [trim(a.icao)!, { lat: a.lat, lon: a.lon, name: a.name }]));
  return { flights, airports };
}

// ---------- editing a closed flight (ADR-021)

export type EditInput = { times: Times; fpm: number | null; fuel: number | null; ground: number | null; catering: number | null };

// Rebuilds the engine input exactly as at closing: the flight's own OFP
// snapshot, rate version, EIA price and rating. Only manual fields change.
async function draftFor(id: number) {
  const [r] = await db()`
    SELECT f.*, rs.params
    FROM flights f JOIN rate_sets rs ON rs.id = f.rate_set_id
    WHERE f.id = ${id} AND f.status = 'closed' AND f.ofp_doc IS NOT NULL`;
  if (!r) return null;
  const lines = await db()`SELECT code, amount_cents FROM ledger_lines WHERE flight_id = ${id} AND source = 'manual'`;
  const manualOf = (code: string) => { const l = lines.find((x) => x.code === code); return l ? -Number(l.amount_cents) / 100 : null; };
  const origin = trim(r.origin_icao)!, planned = trim(r.dest_planned_icao)!, actual = trim(r.dest_actual_icao) ?? planned;
  const [positioningNm, diversionNm] = await Promise.all([
    r.crew_location_icao ? nmBetween(trim(r.crew_location_icao)!, origin) : Promise.resolve(null),
    actual !== planned ? nmBetween(actual, planned) : Promise.resolve(null),
  ]);
  const draft: Draft = {
    ofp: r.ofp_doc as OfpSummary,
    times: { out: iso(r.out_at), off: iso(r.off_at), on: iso(r.on_at), in: iso(r.in_at) },
    fpm: r.fpm,
    manual: { fuel: manualOf('fuel'), ground: manualOf('ground_handling'), catering: manualOf('catering') },
    fuelUsdPerKg: r.eia_fuel_price_per_kg == null ? null : Number(r.eia_fuel_price_per_kg),
    rating: r.rating_at_out == null ? null : Number(r.rating_at_out),
    positioningNm, diversionNm,
  };
  return { draft, params: r.params as RateParams, timesSource: trim(r.times_source) ?? 'mmmm' };
}

export async function editFlight(id: number, e: EditInput): Promise<{ ok: true } | { ok: false; errors: string[] }> {
  const got = await draftFor(id);
  if (!got) return { ok: false, errors: ['אפשר לערוך רק טיסה סגורה שנרשמה במערכת החדשה'] };
  const { draft, params, timesSource } = got;

  // Times measured by VATSIM stay locked; only manual ones ('m') may change.
  const keys = ['out', 'off', 'on', 'in'] as const;
  keys.forEach((k, i) => {
    if (timesSource[i] === 'm' && e.times[k] && !Number.isNaN(Date.parse(e.times[k]!))) draft.times[k] = new Date(e.times[k]!).toISOString();
  });
  const money = (v: number | null) => (v != null && Number.isFinite(v) && v >= 0 && v < 10_000_000 ? Math.round(v * 100) / 100 : null);
  draft.manual = { fuel: money(e.fuel), ground: money(e.ground), catering: money(e.catering) };
  draft.fpm = e.fpm != null && Number.isInteger(e.fpm) && Math.abs(e.fpm) <= 5000 ? -Math.abs(e.fpm) : null;   // always a descent

  const input = toEngineInput(draft);
  const t = draft.times;
  if (!input || draft.fpm == null || draft.manual.fuel == null || draft.manual.ground == null || draft.manual.catering == null) {
    return { ok: false, errors: ['כל השדות חובה'] };
  }
  if (!(Date.parse(t.out!) <= Date.parse(t.off!) && Date.parse(t.off!) <= Date.parse(t.on!) && Date.parse(t.on!) <= Date.parse(t.in!))) {
    return { ok: false, errors: ['סדר הזמנים (PUSHBACK ← המראה ← נחיתה ← GATE)'] };
  }
  const lines = compute(params, input).lines.map((l) => ({ code: l.code, amount_cents: l.amountCents, source: l.source, calc: l.calc }));

  // One statement: update the flight, replace its lines (ADR-007: never patch a line in place).
  await db()`
    WITH u AS (
      UPDATE flights SET out_at = ${t.out}, off_at = ${t.off}, on_at = ${t.on}, in_at = ${t.in},
        fpm = ${draft.fpm}, local_out_hour = ${input.out.hour}, edited_at = now()
      WHERE id = ${id} AND status = 'closed' RETURNING id),
    d AS (DELETE FROM ledger_lines WHERE flight_id IN (SELECT id FROM u))
    INSERT INTO ledger_lines (flight_id, code, amount_cents, source, calc)
    SELECT u.id, x.code, x.amount_cents, x.source, x.calc
    FROM u, jsonb_to_recordset(${JSON.stringify(lines)}::jsonb)
      AS x(code ledger_code, amount_cents bigint, source ledger_source, calc jsonb)`;
  return { ok: true };
}

export async function deleteFlight(id: number) {
  const rows = await db()`DELETE FROM flights WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}
