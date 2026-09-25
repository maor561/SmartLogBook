import 'server-only';
import { db } from './db';
import { EIA_SERIES, parseEia } from './fuel';

// Jet fuel price for the fare surcharge (ADR-025). Source: EIA weekly U.S. Gulf
// Coast kerosene-type jet fuel spot price, $/gal → $/kg. Cached in eia_prices;
// when EIA is down or the key is missing, the last stored week is used — never
// a made-up number. No stored price at all → null → neutral surcharge.
const MAX_AGE_DAYS = 7;

export type FuelPrice = { week: string; usdPerKg: number; stale: boolean };

async function fetchLatest(): Promise<{ week: string; usdPerKg: number } | null> {
  const key = process.env.EIA_API_KEY;
  if (!key) return null;
  const q = new URLSearchParams({
    api_key: key, frequency: 'weekly', 'data[0]': 'value', 'facets[series][]': EIA_SERIES,
    'sort[0][column]': 'period', 'sort[0][direction]': 'desc', length: '1',
  });
  try {
    const res = await fetch(`https://api.eia.gov/v2/petroleum/pri/spt/data/?${q}`, { signal: AbortSignal.timeout(8000), cache: 'no-store' });
    return res.ok ? parseEia(await res.json()) : null;
  } catch {
    return null;
  }
}

export async function currentFuelPrice(): Promise<FuelPrice | null> {
  const [last] = await db()`SELECT week, usd_per_kg, fetched_at FROM eia_prices ORDER BY week DESC LIMIT 1`;
  const fresh = last && Date.now() - new Date(last.fetched_at).getTime() < MAX_AGE_DAYS * 86400e3;
  if (fresh) return { week: new Date(last.week).toISOString().slice(0, 10), usdPerKg: Number(last.usd_per_kg), stale: false };

  const got = await fetchLatest();
  if (got) {
    await db()`INSERT INTO eia_prices (week, usd_per_kg) VALUES (${got.week}, ${got.usdPerKg})
               ON CONFLICT (week) DO UPDATE SET usd_per_kg = EXCLUDED.usd_per_kg, fetched_at = now()`;
    return { ...got, stale: false };
  }
  return last ? { week: new Date(last.week).toISOString().slice(0, 10), usdPerKg: Number(last.usd_per_kg), stale: true } : null;
}
