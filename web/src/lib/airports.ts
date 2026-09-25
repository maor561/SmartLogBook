import 'server-only';
import { db } from './db';
import { boundingBox, nearest } from './geo';

export type Airport = { icao: string; name: string; city: string | null; country: string | null; lat: number; lon: number };

export async function getAirport(icao: string): Promise<Airport | null> {
  const [row] = await db()`SELECT icao, name, city, country, lat, lon FROM airports WHERE icao = ${icao.toUpperCase()}`;
  return (row as Airport) ?? null;
}

// Actual landing airport from the ON position (ADR-033). Widens the box until
// something is found; null if there is no ICAO airport within 200 NM.
export async function nearestAirport(lat: number, lon: number): Promise<(Airport & { distNm: number }) | null> {
  for (const radius of [10, 50, 200]) {
    const b = boundingBox(lat, lon, radius);
    const wraps = b.minLon < -180 || b.maxLon > 180;
    const lo = ((b.minLon + 540) % 360) - 180, hi = ((b.maxLon + 540) % 360) - 180;
    const rows = (await db()`
      SELECT icao, name, city, country, lat, lon FROM airports
      WHERE lat BETWEEN ${b.minLat} AND ${b.maxLat}
        AND (CASE WHEN ${wraps} THEN (lon >= ${lo} OR lon <= ${hi}) ELSE lon BETWEEN ${b.minLon} AND ${b.maxLon} END)`) as Airport[];
    const best = nearest(rows, lat, lon);
    if (best && best.distNm <= radius) return best;
  }
  return null;
}
