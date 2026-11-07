// SQL for the one-time recompute of ADR-064, kept in a plain module so the tests run the same text.

// When the new curve arrived: closed before this = priced again; closed after = priced by it already.
export const CURVE_SINCE_SQL = `SELECT created_at FROM rate_sets WHERE note LIKE '%(ADR-064)' ORDER BY id DESC LIMIT 1`;

// Closed flights (not the historical ones) still priced with another curve, and nothing a recompute could
// disturb: no hard-landing line, no repair request. $1: CURVE_SINCE.
export const CURVE_TODO_SQL = `
  SELECT f.id FROM flights f JOIN rate_sets rs ON rs.id = f.rate_set_id
  WHERE f.status = 'closed' AND f.ofp_doc IS NOT NULL AND f.closed_at < $1
    AND ((rs.params->'fare'->>'f0')::numeric <> 66 OR (rs.params->'fare'->>'k')::numeric <> 1.39
      OR (rs.params->'loadFactor'->>'a')::numeric <> 1 OR (rs.params->'loadFactor'->>'b')::numeric <> 0)
    AND NOT EXISTS (SELECT 1 FROM ledger_lines h WHERE h.flight_id = f.id AND h.code = 'hard_landing')
    AND NOT EXISTS (SELECT 1 FROM repairs r WHERE r.flight_id = f.id)
  ORDER BY coalesce(f.in_at, f.closed_at)`;

// The version written by migration 008 for a flight's own version: the same parameters with the new curve.
export const CURVE_VERSION_SQL = `SELECT id FROM rate_sets WHERE params = $1::jsonb ORDER BY id LIMIT 1`;

export const withCurve = <P extends { fare: { f0: number; k: number }; loadFactor: { a: number; b: number } }>(p: P): P =>
  ({ ...p, fare: { ...p.fare, f0: 66, k: 1.39 }, loadFactor: { ...p.loadFactor, a: 1, b: 0 } });
