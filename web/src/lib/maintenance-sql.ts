// SQL of the fleet and of repair requests (ADR-060). Plain module (no DB import),
// so the test suite runs these very statements on PGlite.

// Air hours of one registration in the new system. Historical flights are not counted (the user, 02.10.2026).
export const AIRFRAME_HOURS_SQL = `
  SELECT coalesce(sum(air_min), 0)::float8 / 60 AS hours
  FROM flights WHERE status = 'closed' AND registration = $1`;

const REPAIR_COLS = `
  r.id, r.flight_id, r.registration, r.tier, r.fpm, r.amount_cents, r.created_at, r.due_at, r.paid_at, r.paid_how,
  f.callsign, f.origin_icao, coalesce(f.dest_actual_icao, f.dest_planned_icao) AS dest_icao`;

// The request that grounds this registration, if any.
export const OPEN_REPAIR_SQL = `
  SELECT ${REPAIR_COLS} FROM repairs r JOIN flights f ON f.id = r.flight_id
  WHERE r.paid_at IS NULL AND r.registration = $1 ORDER BY r.id LIMIT 1`;

export const OPEN_REPAIRS_COUNT_SQL = `SELECT count(*)::int AS n FROM repairs WHERE paid_at IS NULL`;

// Paying: the cost enters the ledger of the flight that caused it, in the same statement.
export const PAY_REPAIR_SQL = `
  WITH p AS (
    UPDATE repairs SET paid_at = now(), paid_how = 'manual' WHERE id = $1 AND paid_at IS NULL
    RETURNING flight_id, amount_cents, calc)
  INSERT INTO ledger_lines (flight_id, code, amount_cents, source, calc)
  SELECT flight_id, 'hard_landing', -amount_cents, 'auto', calc FROM p
  RETURNING flight_id`;

// Unpaid past due_at: released and charged by itself, dated at due_at. Run before anything reads the ledger.
export const SETTLE_OVERDUE_SQL = `
  WITH p AS (
    UPDATE repairs SET paid_at = due_at, paid_how = 'auto' WHERE paid_at IS NULL AND due_at <= $1::timestamptz
    RETURNING flight_id, amount_cents, calc)
  INSERT INTO ledger_lines (flight_id, code, amount_cents, source, calc)
  SELECT flight_id, 'hard_landing', -amount_cents, 'auto', calc FROM p
  RETURNING flight_id`;

// One row per registration flown in the new system.
export const FLEET_SQL = `
  SELECT f.registration,
         (array_agg(f.aircraft_type ORDER BY f.id DESC))[1] AS aircraft_type,
         (array_agg(f.mtow_kg ORDER BY f.id DESC))[1] AS mtow_kg,
         coalesce(sum(f.air_min), 0)::float8 / 60 AS air_hours,
         count(*)::int AS flights,
         count(*) FILTER (WHERE abs(f.fpm) > $1::int)::int AS hard_landings,
         max(coalesce(f.in_at, f.closed_at)) AS last_flight
  FROM flights f
  WHERE f.status = 'closed' AND f.registration IS NOT NULL
  GROUP BY f.registration ORDER BY max(coalesce(f.in_at, f.closed_at)) DESC`;

// Checks (ledger lines) and repairs (requests), newest first.
export const HISTORY_SQL = `
  SELECT * FROM (
    SELECT f.registration, 'check' AS what, l.calc->>'kind' AS kind, NULL::int AS fpm, -l.amount_cents AS amount_cents,
           coalesce(f.in_at, f.closed_at) AS at, 'closing' AS state, NULL::timestamptz AS due_at,
           f.id AS flight_id, f.callsign, f.origin_icao, coalesce(f.dest_actual_icao, f.dest_planned_icao) AS dest_icao
    FROM ledger_lines l JOIN flights f ON f.id = l.flight_id
    WHERE l.code = 'maintenance_check' AND f.registration IS NOT NULL
    UNION ALL
    SELECT r.registration, 'repair', r.tier, r.fpm, r.amount_cents,
           coalesce(r.paid_at, r.created_at), coalesce(r.paid_how, 'open'), r.due_at,
           f.id, f.callsign, f.origin_icao, coalesce(f.dest_actual_icao, f.dest_planned_icao)
    FROM repairs r JOIN flights f ON f.id = r.flight_id
  ) h ORDER BY at DESC, flight_id DESC`;

// Closing a flight with a hard landing: one more CTE in the closing statement (flight-actions.ts).
// Editing a closed flight keeps its repair in step with the recomputed landing (logbook.ts):
export const REPAIR_OF_FLIGHT_SQL = `SELECT id, amount_cents, paid_at FROM repairs WHERE flight_id = $1`;
export const UPDATE_REPAIR_SQL = `UPDATE repairs SET amount_cents = $2, tier = $3, fpm = $4, calc = $5::jsonb WHERE id = $1`;
export const DELETE_REPAIR_SQL = `DELETE FROM repairs WHERE id = $1`;
export const INSERT_REPAIR_SQL = `
  INSERT INTO repairs (flight_id, registration, tier, fpm, amount_cents, calc, due_at)
  VALUES ($1, $2, $3, $4, $5, $6::jsonb, now() + make_interval(days => $7::int))
  ON CONFLICT (flight_id) DO NOTHING`;
