// OurAirports → `airports` (ADR-033). Open data, public domain.
const SOURCE = 'https://davidmegginson.github.io/ourairports-data/airports.csv';
const TYPES = new Set(['large_airport', 'medium_airport', 'small_airport']);
const BATCH = 1000;

// Minimal RFC 4180 parser: quoted fields, doubled quotes, commas/newlines inside quotes.
export function parseCsv(text) {
  const rows = [];
  let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

export function toAirports(csvText) {
  const [head, ...rows] = parseCsv(csvText);
  const col = Object.fromEntries(head.map((h, i) => [h, i]));
  const out = new Map();
  for (const r of rows) {
    const icao = (r[col.icao_code] || '').trim().toUpperCase();
    if (!/^[A-Z]{4}$/.test(icao) || !TYPES.has(r[col.type])) continue;
    const lat = Number(r[col.latitude_deg]), lon = Number(r[col.longitude_deg]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    // A few ICAO codes appear twice; keep the larger airport.
    const prev = out.get(icao);
    if (prev && rank(prev.type) >= rank(r[col.type])) continue;
    const elev = parseInt(r[col.elevation_ft], 10);
    out.set(icao, {
      icao, name: r[col.name], city: r[col.municipality] || null, country: (r[col.iso_country] || '').slice(0, 2) || null,
      lat, lon, elevation_ft: Number.isFinite(elev) ? elev : null, type: r[col.type],
    });
  }
  return [...out.values()];
}
const rank = (t) => (t === 'large_airport' ? 3 : t === 'medium_airport' ? 2 : 1);

export async function importAirports(client) {
  console.log('[airports] downloading OurAirports…');
  const res = await fetch(SOURCE);
  if (!res.ok) throw new Error(`OurAirports download failed: ${res.status}`);
  const list = toAirports(await res.text());
  if (list.length < 5000) throw new Error(`OurAirports looks wrong: only ${list.length} ICAO airports`);

  await client.query('BEGIN');
  try {
    for (let i = 0; i < list.length; i += BATCH) {
      const chunk = list.slice(i, i + BATCH);
      const vals = [], args = [];
      chunk.forEach((a, j) => {
        const b = j * 8;
        vals.push(`($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7},$${b + 8})`);
        args.push(a.icao, a.name, a.city, a.country, a.lat, a.lon, a.elevation_ft, a.type);
      });
      await client.query(
        `INSERT INTO airports (icao, name, city, country, lat, lon, elevation_ft, type) VALUES ${vals.join(',')}
         ON CONFLICT (icao) DO NOTHING`, args);
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  }
  console.log(`[airports] imported ${list.length}`);
}
