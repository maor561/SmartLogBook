// SimBrief OFP → compact summary. Same shape as tracker/src/ofp.js (the Worker
// keeps its own copy; test/ofp.test.mjs checks both give identical output).
const LB = 0.45359237;

export type OfpSummary = {
  id: string;
  generated_at: string | null;
  callsign: string | null;
  origin: { icao: string; lat: number | null; lon: number | null; elev_ft: number | null };
  dest: { icao: string; lat: number | null; lon: number | null; elev_ft: number | null };
  alternate: string | null;
  route_distance_nm: number | null;
  gc_distance_nm: number | null;
  aircraft: { type: string | null; reg: string | null; seats: number | null };
  weights: {
    mtow_kg: number | null; mlw_kg: number | null; oew_kg: number | null; payload_kg: number | null;
    pax: number | null; freight_kg: number | null; cargo_kg: number | null; bag_count: number | null; bag_kg: number | null;
  };
  sched: { out: string | null; off: string | null; on: string | null; in: string | null };
  orig_utc_offset: number | null;
};

type Raw = Record<string, Record<string, unknown> | undefined>;
const num = (v: unknown) => (v === undefined || v === null || typeof v === 'object' || v === '' ? null : Number(v));
const str = (v: unknown) => (typeof v === 'string' && v !== '' ? v : null);
const iso = (s: unknown) => { const n = num(s); return n ? new Date(n * 1000).toISOString() : null; };

export function summarizeOfp(j: Raw | null | undefined): OfpSummary | null {
  if (!j?.params?.request_id || !j.origin?.icao_code) return null;
  const k = j.params.units === 'lbs' ? LB : 1;
  const W = j.weights ?? {};
  const w = (key: string) => (num(W[key]) == null ? null : Math.round(num(W[key])! * k));
  return {
    id: String(j.params.request_id),
    generated_at: iso(j.params.time_generated),
    callsign: str(j.atc?.callsign),
    origin: { icao: j.origin.icao_code as string, lat: num(j.origin.pos_lat), lon: num(j.origin.pos_long), elev_ft: num(j.origin.elevation) },
    dest: { icao: j.destination?.icao_code as string, lat: num(j.destination?.pos_lat), lon: num(j.destination?.pos_long), elev_ft: num(j.destination?.elevation) },
    alternate: str(j.alternate?.icao_code),
    route_distance_nm: num(j.general?.route_distance),
    gc_distance_nm: num(j.general?.gc_distance),
    aircraft: { type: str(j.aircraft?.icao_code), reg: str(j.aircraft?.reg), seats: num(j.aircraft?.max_passengers) },
    weights: {
      mtow_kg: w('max_tow'), mlw_kg: w('max_ldw'), oew_kg: w('oew'), payload_kg: w('payload'),
      pax: num(W.pax_count), freight_kg: w('freight_added'), cargo_kg: w('cargo'),
      bag_count: num(W.bag_count), bag_kg: num(W.bag_weight) == null ? null : num(W.bag_weight)! * k,
    },
    sched: { out: iso(j.times?.sched_out), off: iso(j.times?.sched_off), on: iso(j.times?.sched_on), in: iso(j.times?.sched_in) },
    orig_utc_offset: num(j.times?.orig_timezone),
  };
}
