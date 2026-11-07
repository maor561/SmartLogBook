// SQL for the recompute of ADR-063, kept in a plain module so the tests run the same text.

// Flights with fuel on board whose fare was still priced with EIA, and nothing that a recompute could disturb
// (no hard-landing line, no repair request).
export const FARE_FUEL_TODO_SQL = `
  SELECT f.id FROM flights f
  JOIN ledger_lines t ON t.flight_id = f.id AND t.code = 'tickets'
  WHERE f.status = 'closed' AND f.fuel_state IS NOT NULL AND f.ofp_doc IS NOT NULL
    AND NOT (t.calc ? 'fuelSource')
    AND NOT EXISTS (SELECT 1 FROM ledger_lines h WHERE h.flight_id = f.id AND h.code = 'hard_landing')
    AND NOT EXISTS (SELECT 1 FROM repairs r WHERE r.flight_id = f.id)
  ORDER BY coalesce(f.in_at, f.closed_at)`;

// The first rate version with the 30% cap: the version these flights are moved to.
export const RATE_WITH_CAP_SQL = `
  SELECT id, params FROM rate_sets WHERE (params->'fuel'->>'maxPct')::numeric >= 30 ORDER BY id LIMIT 1`;
