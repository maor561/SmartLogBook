// Brings the Neon database up to date. Runs before `next build` (ADR-041):
//   1. applies db/migrations/*.sql in order, once each (schema_migrations)
//   2. seeds rate_set v1 from db/rate-set-v1.json and the settings row
//   3. imports OurAirports into `airports` when the table is empty (ADR-033)
// Without DATABASE_URL it does nothing, so local builds and CI still work.
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from '@neondatabase/serverless';
import { importAirports } from './airports.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) {
  console.log('[migrate] DATABASE_URL not set — skipping.');
  process.exit(0);
}

const pool = new Pool({ connectionString: url });
const client = await pool.connect();
try {
  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
  const done = new Set((await client.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name));

  const files = readdirSync(join(ROOT, 'db/migrations')).filter((f) => f.endsWith('.sql')).sort();
  for (const f of files) {
    if (done.has(f)) continue;
    console.log(`[migrate] applying ${f}`);
    await client.query('BEGIN');
    try {
      await client.query(readFileSync(join(ROOT, 'db/migrations', f), 'utf8'));
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [f]);
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    }
  }

  const { rows } = await client.query('SELECT count(*)::int AS n FROM rate_sets');
  if (rows[0].n === 0) {
    const params = JSON.parse(readFileSync(join(ROOT, 'db/rate-set-v1.json'), 'utf8'));
    const v1 = await client.query(
      `INSERT INTO rate_sets (note, params) VALUES ($1, $2) RETURNING id`,
      ['ברירות מחדל (כיול K=1.51, יעד 20%)', params],
    );
    await client.query(
      `INSERT INTO settings (simbrief_id, vatsim_cid, current_rate_set_id) VALUES ($1, $2, $3)
       ON CONFLICT (id) DO NOTHING`,
      ['MAOR561', 1242058, v1.rows[0].id],
    );
    console.log('[migrate] seeded rate_set v1 and settings');
  }

  const ap = await client.query('SELECT count(*)::int AS n FROM airports');
  if (ap.rows[0].n === 0) await importAirports(client);

  console.log('[migrate] up to date');
} finally {
  client.release();
  await pool.end();
}
