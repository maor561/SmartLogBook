// SimBrief OFP → the compact summary the tracker keeps and the app turns into a
// flight (DATA_MODEL: flights). The full OFP is ~1.7 MB; this is ~1 KB.
const LB = 0.45359237;

const num = (v) => (v === undefined || v === null || typeof v === 'object' || v === '' ? null : Number(v));
const str = (v) => (typeof v === 'string' && v !== '' ? v : null);
const iso = (epochSec) => (num(epochSec) ? new Date(num(epochSec) * 1000).toISOString() : null);

export function summarizeOfp(j) {
  if (!j?.params?.request_id || !j.origin?.icao_code) return null;
  const k = j.params.units === 'lbs' ? LB : 1;
  const w = (key) => (num(j.weights?.[key]) == null ? null : Math.round(num(j.weights[key]) * k));
  return {
    id: String(j.params.request_id),
    generated_at: iso(j.params.time_generated),
    callsign: str(j.atc?.callsign),
    origin: { icao: j.origin.icao_code, lat: num(j.origin.pos_lat), lon: num(j.origin.pos_long), elev_ft: num(j.origin.elevation) },
    dest: { icao: j.destination?.icao_code, lat: num(j.destination?.pos_lat), lon: num(j.destination?.pos_long), elev_ft: num(j.destination?.elevation) },
    alternate: str(j.alternate?.icao_code),
    route_distance_nm: num(j.general?.route_distance),
    gc_distance_nm: num(j.general?.gc_distance),
    aircraft: { type: str(j.aircraft?.icao_code), reg: str(j.aircraft?.reg), seats: num(j.aircraft?.max_passengers) },
    weights: {
      mtow_kg: w('max_tow'), mlw_kg: w('max_ldw'), oew_kg: w('oew'), payload_kg: w('payload'),
      pax: num(j.weights?.pax_count), freight_kg: w('freight_added'), cargo_kg: w('cargo'),
      bag_count: num(j.weights?.bag_count), bag_kg: num(j.weights?.bag_weight) == null ? null : num(j.weights.bag_weight) * k,
    },
    sched: { out: iso(j.times?.sched_out), off: iso(j.times?.sched_off), on: iso(j.times?.sched_on), in: iso(j.times?.sched_in) },
    orig_utc_offset: num(j.times?.orig_timezone),
  };
}

export async function fetchOfp(simbriefId) {
  const key = /^\d+$/.test(simbriefId) ? 'userid' : 'username';
  const res = await fetch(`https://www.simbrief.com/api/xml.fetcher.php?${key}=${encodeURIComponent(simbriefId)}&json=1`);
  if (res.status === 400) return null;                    // no such user / no OFP
  if (!res.ok) throw new Error(`SimBrief HTTP ${res.status}`);
  return summarizeOfp(await res.json());
}
