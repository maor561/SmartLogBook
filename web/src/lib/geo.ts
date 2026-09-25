// Great-circle distance and nearest-airport lookup (ADR-033). Pure; the DB
// query in airports.ts narrows candidates with a lat/lon box first.

const R_NM = 3440.065;
const rad = (d: number) => (d * Math.PI) / 180;

export function distanceNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 2 * R_NM * Math.asin(Math.min(1, Math.sqrt(a)));
}

// Search box of ±radiusNm around a point, in degrees. Longitude widens toward the poles.
export function boundingBox(lat: number, lon: number, radiusNm: number) {
  const dLat = radiusNm / 60;
  const dLon = radiusNm / (60 * Math.max(Math.cos(rad(lat)), 0.01));
  return { minLat: lat - dLat, maxLat: lat + dLat, minLon: lon - dLon, maxLon: lon + dLon };
}

export function nearest<T extends { lat: number; lon: number }>(list: T[], lat: number, lon: number): (T & { distNm: number }) | null {
  let best: (T & { distNm: number }) | null = null;
  for (const a of list) {
    const d = distanceNm(lat, lon, a.lat, a.lon);
    if (!best || d < best.distNm) best = { ...a, distNm: d };
  }
  return best;
}
