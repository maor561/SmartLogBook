import 'server-only';
import { MongoClient } from 'mongodb';
import { db } from './db';
import { mapLegacy, type LegacyDoc, type LegacyRow } from './legacy-map';

// One-time import of the old app's flights (WP8, ADR-030). Reads the old
// MongoDB (MONGODB_URI, copied by the user from the old Vercel project) and
// writes each missing flight as `historical` with one legacy_profit line.
// Idempotent: a flight whose legacy_doc._id is already here is skipped.

export function hasLegacy() {
  return Boolean(process.env.MONGODB_URI);
}

async function readDocs(): Promise<LegacyDoc[]> {
  const client = new MongoClient(process.env.MONGODB_URI!, { serverSelectionTimeoutMS: 8000 });
  try {
    await client.connect();
    const docs = await client.db('smartlogbook').collection('flights').find({}).sort({ date: 1 }).toArray();
    // Plain JSON: ObjectIds → strings, Dates → ISO.
    return JSON.parse(JSON.stringify(docs)) as LegacyDoc[];
  } finally {
    await client.close();
  }
}

export type LegacyPlan = {
  total: number; missing: LegacyRow[]; present: number; errors: string[];
  mongoProfitCents: number; from: string | null; to: string | null;
};

export async function planLegacyImport(): Promise<LegacyPlan> {
  const docs = await readDocs();
  const rows: LegacyRow[] = [], errors: string[] = [];
  for (const d of docs) { const m = mapLegacy(d); if ('error' in m) errors.push(m.error); else rows.push(m); }
  const have = new Set((await db()`SELECT legacy_doc->>'_id' AS id FROM flights WHERE legacy_doc IS NOT NULL`).map((r) => r.id as string));
  return {
    total: docs.length,
    missing: rows.filter((r) => !have.has(r.legacyId)),
    present: rows.filter((r) => have.has(r.legacyId)).length,
    errors,
    mongoProfitCents: rows.reduce((s, r) => s + r.profitCents, 0),
    from: rows[0]?.date ?? null,
    to: rows.at(-1)?.date ?? null,
  };
}

export async function runLegacyImport() {
  const docs = await readDocs();
  const byId = new Map(docs.map((d) => [String(d._id), d]));
  const plan = await planLegacyImport();
  const rows = plan.missing.map((r) => ({
    status: 'historical', source: 'historical', origin_icao: r.origin, dest_planned_icao: r.dest, dest_actual_icao: r.dest,
    aircraft_type: r.aircraft, seats: r.seats, pax: r.pax, payload_kg: r.payloadKg, route_distance_nm: r.distanceNm,
    legacy_planned_air_min: r.plannedAirMin, fpm: r.fpm, sched_out: r.date, closed_at: r.date,
    legacy_doc: byId.get(r.legacyId), profit_cents: r.profitCents,
  }));
  if (rows.length) {
    // One statement: every flight and its single legacy_profit line, or nothing.
    await db()`
      WITH src AS (
        SELECT * FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) AS x(
          status flight_status, source flight_source, origin_icao char(4), dest_planned_icao char(4), dest_actual_icao char(4),
          aircraft_type text, seats integer, pax integer, payload_kg integer, route_distance_nm integer,
          legacy_planned_air_min integer, fpm integer, sched_out timestamptz, closed_at timestamptz, legacy_doc jsonb, profit_cents bigint)),
      ins AS (
        INSERT INTO flights (status, source, origin_icao, dest_planned_icao, dest_actual_icao, aircraft_type, seats, pax, payload_kg,
          route_distance_nm, legacy_planned_air_min, fpm, sched_out, closed_at, legacy_doc)
        SELECT status, source, origin_icao, dest_planned_icao, dest_actual_icao, aircraft_type, seats, pax, payload_kg,
          route_distance_nm, legacy_planned_air_min, fpm, sched_out, closed_at, legacy_doc FROM src
        RETURNING id, legacy_doc->>'_id' AS legacy_id)
      INSERT INTO ledger_lines (flight_id, code, amount_cents, source, calc)
      SELECT ins.id, 'legacy_profit', src.profit_cents, 'legacy', jsonb_build_object('legacy_id', ins.legacy_id)
      FROM ins JOIN src ON src.legacy_doc->>'_id' = ins.legacy_id`;
  }
  // WP8 "done": the migrated flights sum to exactly the old profit.
  const [{ cents }] = await db()`
    SELECT coalesce(sum(l.amount_cents), 0)::bigint AS cents FROM ledger_lines l
    JOIN flights f ON f.id = l.flight_id WHERE f.status = 'historical' AND l.code = 'legacy_profit'`;
  return { imported: rows.length, skipped: plan.present, errors: plan.errors, neonCents: Number(cents), mongoCents: plan.mongoProfitCents };
}
