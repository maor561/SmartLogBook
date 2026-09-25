import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import ExcelJS from 'exceljs';
import { db } from './db';
import { SOURCE_LABEL, tagsOf, TAG_LABEL, type LogFlight } from './logbook-filter';

// Excel export + restore-only import (ADR-013). The workbook has a readable
// sheet and a hidden "_backup" sheet: the full rows of every exported flight
// and its ledger lines, signed with a key derived from SESSION_SECRET. Import
// accepts only a file whose signature checks out, and only re-creates flights
// that are missing — it never creates anything that wasn't exported.

const CHUNK = 30_000;                       // Excel's cell limit is 32,767 chars
const FORMAT = 'smartlogbook-backup-v1';

function key() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error('SESSION_SECRET missing');
  return createHmac('sha256', s).update('logbook-backup').digest();
}
const sign = (payload: string) => createHmac('sha256', key()).update(payload).digest('base64url');

const hm = (m: number | null) => (m == null ? '' : `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`);
const d = (iso: string | null) => (iso ? new Date(iso) : null);

export async function buildWorkbook(list: LogFlight[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SmartLogBook';
  const ws = wb.addWorksheet('לוגבוק', { views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }] });
  ws.columns = [
    { header: 'תאריך (UTC)', key: 'date', width: 18, style: { numFmt: 'yyyy-mm-dd hh:mm' } },
    { header: 'אות קריאה', key: 'cs', width: 12 },
    { header: 'מוצא', key: 'o', width: 8 },
    { header: 'יעד', key: 't', width: 8 },
    { header: 'יעד מתוכנן', key: 'p', width: 10 },
    { header: 'מטוס', key: 'ac', width: 8 },
    { header: 'רישום', key: 'reg', width: 10 },
    { header: 'מקור', key: 'src', width: 10 },
    { header: 'PUSHBACK', key: 'out', width: 16, style: { numFmt: 'yyyy-mm-dd hh:mm' } },
    { header: 'המראה', key: 'off', width: 16, style: { numFmt: 'yyyy-mm-dd hh:mm' } },
    { header: 'נחיתה', key: 'on', width: 16, style: { numFmt: 'yyyy-mm-dd hh:mm' } },
    { header: 'GATE', key: 'in', width: 16, style: { numFmt: 'yyyy-mm-dd hh:mm' } },
    { header: 'בלוק', key: 'block', width: 8 },
    { header: 'באוויר', key: 'air', width: 8 },
    { header: 'FPM', key: 'fpm', width: 7 },
    { header: 'נוסעים', key: 'pax', width: 8 },
    { header: 'מטען (ק״ג)', key: 'cargo', width: 10 },
    { header: 'מרחק (NM)', key: 'nm', width: 10 },
    { header: 'רווח ($)', key: 'profit', width: 12, style: { numFmt: '#,##0.00;[Red]-#,##0.00' } },
    { header: 'תגים', key: 'tags', width: 22 },
  ];
  ws.getRow(1).font = { bold: true };
  for (const f of list) {
    ws.addRow({
      date: d(f.date), cs: f.callsign, o: f.origin, t: f.dest, p: f.plannedDest, ac: f.aircraft, reg: f.reg,
      src: SOURCE_LABEL[f.source], out: d(f.times.out), off: d(f.times.off), on: d(f.times.on), in: d(f.times.in),
      block: hm(f.blockMin), air: hm(f.airMin), fpm: f.fpm, pax: f.pax, cargo: f.cargoKg, nm: f.distanceNm,
      profit: f.profitCents / 100, tags: tagsOf(f).map((t) => TAG_LABEL[t]).join(', '),
    });
  }

  // Full-fidelity backup of exactly these flights.
  const ids = list.map((f) => f.id);
  const flights = ids.length ? await db()`SELECT * FROM flights WHERE id = ANY(${ids}) ORDER BY id` : [];
  const lines = ids.length ? await db()`SELECT flight_id, code, amount_cents, source, calc FROM ledger_lines WHERE flight_id = ANY(${ids}) ORDER BY id` : [];
  const payload = JSON.stringify({ format: FORMAT, exported_at: new Date().toISOString(), flights, lines });
  const bk = wb.addWorksheet('_backup', { state: 'veryHidden' });
  bk.addRow([FORMAT, sign(payload), Math.ceil(payload.length / CHUNK)]);
  for (let i = 0; i < payload.length; i += CHUNK) bk.addRow([payload.slice(i, i + CHUNK)]);

  return Buffer.from(await wb.xlsx.writeBuffer());
}

type BackupFlight = Record<string, unknown> & { id: number; ofp_id: string | null; legacy_doc: { _id?: string } | null };
type BackupLine = { flight_id: number; code: string; amount_cents: string | number; source: string; calc: unknown };

export async function readBackup(file: ArrayBuffer): Promise<{ flights: BackupFlight[]; lines: BackupLine[] }> {
  const wb = new ExcelJS.Workbook();
  try { await wb.xlsx.load(file); } catch { throw new Error('זה לא קובץ Excel תקין'); }
  const bk = wb.getWorksheet('_backup');
  if (!bk) throw new Error('הקובץ לא יוצא מ-SmartLogBook (אין גיבוי בתוכו)');
  const [format, sig, n] = (bk.getRow(1).values as unknown[]).slice(1) as [string, string, number];
  if (format !== FORMAT) throw new Error('גרסת גיבוי לא מוכרת');
  let payload = '';
  for (let i = 0; i < n; i++) payload += String(bk.getRow(i + 2).getCell(1).value ?? '');
  const a = Buffer.from(sign(payload)), b = Buffer.from(String(sig));
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error('הקובץ שונה אחרי הייצוא, או יוצא ממערכת אחרת. השחזור נדחה');
  const data = JSON.parse(payload);
  return { flights: data.flights, lines: data.lines };
}

// Columns restored as-is. Generated columns (block_min, air_min) and ids are not.
const COLS = [
  'callsign', 'ofp_id', 'ofp_generated_at', 'status', 'source', 'origin_icao', 'dest_planned_icao', 'dest_actual_icao', 'alternate_icao',
  'route_distance_nm', 'gc_distance_nm', 'aircraft_type', 'registration', 'seats', 'mtow_kg', 'mlw_kg', 'oew_kg',
  'pax', 'cargo_kg', 'payload_kg', 'sched_out', 'sched_off', 'sched_on', 'sched_in', 'out_at', 'off_at', 'on_at', 'in_at',
  'times_source', 'fpm', 'landing_lat', 'landing_lon', 'crew_location_icao', 'rate_set_id', 'eia_fuel_price_per_kg',
  'local_out_hour', 'orig_utc_offset', 'rating_at_out', 'closed_at', 'edited_at', 'legacy_planned_air_min', 'legacy_doc', 'ofp_doc', 'created_at',
] as const;

// Re-creates flights from the backup that are not in the logbook any more.
// Identity: ofp_id for app flights, legacy_doc._id for migrated ones.
export async function restoreMissing(b: { flights: BackupFlight[]; lines: BackupLine[] }) {
  let restored = 0, skipped = 0;
  for (const f of b.flights) {
    const legacyId = f.legacy_doc?._id ?? null;
    const [exists] = f.ofp_id
      ? await db()`SELECT 1 FROM flights WHERE ofp_id = ${f.ofp_id}`
      : legacyId ? await db()`SELECT 1 FROM flights WHERE legacy_doc->>'_id' = ${legacyId}` : [null];
    if (exists) { skipped++; continue; }
    const row = Object.fromEntries(COLS.map((c) => [c, f[c] ?? null]));
    const lines = b.lines.filter((l) => l.flight_id === f.id).map((l) => ({ ...l, amount_cents: Number(l.amount_cents) }));
    // Column names come from the COLS constant above, never from the file.
    const cols = COLS.join(', ');
    await db().query(
      `WITH n AS (
         INSERT INTO flights (${cols})
         SELECT ${cols} FROM jsonb_populate_record(null::flights, $1::jsonb)
         RETURNING id)
       INSERT INTO ledger_lines (flight_id, code, amount_cents, source, calc)
       SELECT n.id, x.code, x.amount_cents, x.source, x.calc
       FROM n, jsonb_to_recordset($2::jsonb)
         AS x(code ledger_code, amount_cents bigint, source ledger_source, calc jsonb)`,
      [JSON.stringify(row), JSON.stringify(lines)],
    );
    restored++;
  }
  return { restored, skipped };
}
