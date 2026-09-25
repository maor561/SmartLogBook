import 'server-only';
import { db } from './db';
import type { RateParams } from './rates/params';

export type Settings = {
  simbriefId: string | null;
  vatsimCid: number | null;
  homeBaseIcao: string;
  homeBaseName: string | null;
  currentRateSetId: number;
};

export type RateVersion = { id: number; createdAt: string; note: string | null; flights: number; params: RateParams };

export async function getSettings(): Promise<Settings> {
  const [s] = await db()`
    SELECT s.simbrief_id, s.vatsim_cid, s.home_base_icao, s.current_rate_set_id, a.name AS home_name
    FROM settings s LEFT JOIN airports a ON a.icao = s.home_base_icao WHERE s.id = 1`;
  if (!s) throw new Error('settings row missing — run the migrations');
  return {
    simbriefId: s.simbrief_id, vatsimCid: s.vatsim_cid, homeBaseIcao: s.home_base_icao.trim(),
    homeBaseName: s.home_name, currentRateSetId: s.current_rate_set_id,
  };
}

export async function listRateVersions(): Promise<RateVersion[]> {
  const rows = await db()`
    SELECT r.id, r.created_at, r.note, r.params, count(f.id)::int AS flights
    FROM rate_sets r LEFT JOIN flights f ON f.rate_set_id = r.id
    GROUP BY r.id ORDER BY r.id DESC`;
  return rows.map((r) => ({ id: r.id, createdAt: new Date(r.created_at).toISOString(), note: r.note, flights: r.flights, params: r.params }));
}

// New immutable version + switch the pointer, in one statement (ADR-021).
export async function createRateVersion(params: RateParams, note: string | null): Promise<number> {
  const [row] = await db()`
    WITH v AS (INSERT INTO rate_sets (note, params) VALUES (${note}, ${JSON.stringify(params)}::jsonb) RETURNING id)
    UPDATE settings SET current_rate_set_id = (SELECT id FROM v), updated_at = now() WHERE id = 1
    RETURNING current_rate_set_id`;
  return row.current_rate_set_id;
}

export async function updateAccounts(a: { simbriefId: string | null; vatsimCid: number | null; homeBaseIcao: string }) {
  await db()`
    UPDATE settings SET simbrief_id = ${a.simbriefId}, vatsim_cid = ${a.vatsimCid},
      home_base_icao = ${a.homeBaseIcao}, updated_at = now()
    WHERE id = 1`;
}
