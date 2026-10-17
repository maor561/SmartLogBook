// SQL for fuel on board (ADR-062), kept in a plain module so the tests run the same text on Postgres.

// The latest closed flight of a registration, and what it left in the tanks (NULL: the chain is broken).
export const FUEL_CHAIN_SQL = `
  SELECT id, callsign, origin_icao, coalesce(dest_actual_icao, dest_planned_icao) AS dest, fuel_state
  FROM flights
  WHERE registration = $1 AND status = 'closed'
  ORDER BY coalesce(in_at, closed_at) DESC, id DESC
  LIMIT 1`;
