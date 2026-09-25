import 'server-only';
import { db } from './db';
import { loadLogbook } from './logbook';
import { companyRating, milestoneCrossings } from './rating';
import type { Range } from './analysis';

import { PNL_SQL, pnlParams } from './analysis-sql';

// Money by ledger line for a period: a direct SUM over ledger_lines (ADR-007).
// The statement lives in analysis-sql.ts so the tests run it on Postgres too.
export async function pnlByCode(r: Range, includeHistorical: boolean) {
  const rows = await db().query(PNL_SQL, pnlParams(r, includeHistorical));
  return Object.fromEntries(rows.map((x) => [x.code as string, Number(x.cents)])) as Record<string, number>;
}

// Records every milestone reached so far (append-only; UNIQUE(category, threshold)).
export async function syncMilestones() {
  const { flights } = await loadLogbook();
  const { crossings } = milestoneCrossings(flights);
  if (!crossings.length) return;
  await db()`
    INSERT INTO milestones (category, threshold, achieved_at, flight_id)
    SELECT x.cat, x.threshold, x.at, x.flight_id
    FROM jsonb_to_recordset(${JSON.stringify(crossings.map((c) => ({ cat: c.cat, threshold: c.threshold, at: c.at, flight_id: c.flightId })))}::jsonb)
      AS x(cat text, threshold bigint, at timestamptz, flight_id integer)
    ON CONFLICT (category, threshold) DO NOTHING`;
}

export async function milestonesAchieved() {
  const rows = await db()`SELECT category, threshold, achieved_at, flight_id FROM milestones ORDER BY achieved_at DESC`;
  return rows.map((m) => ({ cat: m.category as string, threshold: Number(m.threshold), at: new Date(m.achieved_at).toISOString(), flightId: m.flight_id as number | null }));
}

// Rating before the next flight, for the reputation factor in the fare (ADR-037).
export async function currentRating() {
  const { flights } = await loadLogbook();
  return companyRating(flights)?.overall ?? null;
}
