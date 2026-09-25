// Old MongoDB flight → new `flights` row + one ledger line (ADR-030). Pure.
// Nothing is recomputed or invented: the old profit becomes a single
// `legacy_profit` line, the planned air time is kept as such, and the whole
// original document is stored in legacy_doc.

export const LEGACY_DEFAULT_FPM = 145;

export type LegacyDoc = Record<string, unknown> & { _id: string };

const num = (v: unknown) => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? null : Number(v));
const icao = (v: unknown) => (typeof v === 'string' && /^[A-Z0-9]{3,4}$/i.test(v.trim()) ? v.trim().toUpperCase().padEnd(4).slice(0, 4) : null);

export type LegacyRow = {
  legacyId: string;
  date: string;
  origin: string;
  dest: string;
  aircraft: string | null;
  seats: number | null;
  pax: number | null;
  payloadKg: number | null;
  distanceNm: number | null;
  plannedAirMin: number | null;
  fpm: number | null;
  profitCents: number;
};

export function mapLegacy(d: LegacyDoc): LegacyRow | { error: string } {
  const origin = icao(d.origin), dest = icao(d.destination);
  const date = typeof d.date === 'string' || d.date instanceof Date ? new Date(d.date as string) : null;
  const profit = num(d.profit);
  if (!origin || !dest) return { error: `${d._id}: קוד שדה לא תקין (${String(d.origin)} → ${String(d.destination)})` };
  if (!date || Number.isNaN(date.getTime())) return { error: `${d._id}: תאריך לא תקין` };
  if (profit == null) return { error: `${d._id}: אין רווח` };
  const fpm = num(d.fpm);
  return {
    legacyId: String(d._id),
    date: date.toISOString(),
    origin, dest,
    aircraft: typeof d.aircraft === 'string' ? d.aircraft : null,
    seats: num(d.aircraft_max_passengers),
    pax: num(d.passengers),
    payloadKg: num(d.payload),
    distanceNm: num(d.distance),
    plannedAirMin: num(d.duration_mins),
    // 0 = never entered in the old app. User's decision (ADR-048): count it as a
    // normal 145 fpm landing. legacy_doc keeps the original 0.
    fpm: fpm === 0 ? -LEGACY_DEFAULT_FPM : fpm,
    profitCents: Math.round(profit * 100),
  };
}
