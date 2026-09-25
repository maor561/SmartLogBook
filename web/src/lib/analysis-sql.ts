// The P&L statement of the analysis screen (ADR-007: reports only SUM the ledger).
// Plain module (no DB import) so the test suite can run it on PGlite.
import type { Range } from './analysis';

// Date of a flight = IN, else closing time — the same rule as the logbook (LogFlight.date).
export const PNL_SQL = `
  SELECT l.code, sum(l.amount_cents)::bigint AS cents
  FROM ledger_lines l JOIN flights f ON f.id = l.flight_id
  WHERE f.status::text = ANY(string_to_array($1, ','))
    AND ($2::timestamptz IS NULL OR coalesce(f.in_at, f.closed_at, f.created_at) >= $2::timestamptz)
    AND ($3::timestamptz IS NULL OR coalesce(f.in_at, f.closed_at, f.created_at) < $3::timestamptz)
  GROUP BY l.code`;

export function pnlParams(r: Range, includeHistorical: boolean) {
  // Statuses as 'a,b': a plain text parameter behaves the same on every Postgres driver.
  return [includeHistorical ? 'closed,historical' : 'closed', r.from?.toISOString() ?? null, r.to?.toISOString() ?? null];
}
