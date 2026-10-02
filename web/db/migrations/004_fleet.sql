-- Fleet maintenance (sketch s12, ADR-060).

-- Periodic checks are a ledger line of their own, on the flight that crossed the interval.
ALTER TYPE ledger_code ADD VALUE IF NOT EXISTS 'maintenance_check';

-- Air hours the registration had flown before this flight: the snapshot that decides
-- whether a check was due, so a later edit recomputes the same thing (ADR-021).
ALTER TABLE flights ADD COLUMN airframe_hours_before numeric(10,2);

-- A hard landing opens a repair request instead of an immediate cost. While it is unpaid
-- (and not past due_at) the aircraft is grounded. Paying, or due_at passing, writes the
-- 'hard_landing' line into the ledger of the flight that caused it (ADR-007).
CREATE TABLE repairs (
  id            serial PRIMARY KEY,
  flight_id     integer NOT NULL UNIQUE REFERENCES flights(id) ON DELETE CASCADE,
  registration  text NOT NULL,
  tier          text NOT NULL,                 -- visual | amm | structural
  fpm           integer,
  amount_cents  bigint NOT NULL CHECK (amount_cents > 0),
  calc          jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  due_at        timestamptz NOT NULL,          -- released and charged by itself at this time
  paid_at       timestamptz,
  paid_how      text CHECK (paid_how IN ('manual', 'auto'))
);
CREATE INDEX repairs_open ON repairs (registration) WHERE paid_at IS NULL;

-- A new rate version (ADR-021): the hourly maintenance rate drops by 3.8 $/t/h, and the
-- same money is charged as a light check every 100 air hours and a medium one every 600.
-- Per 600 h: 5 × 190 + 1,330 = 2,280 $/t = 600 × 3.8. Skipped on an empty database
-- (the seed already has the split) and when the current version already has checks.
WITH cur AS (
  SELECT rs.params FROM settings s JOIN rate_sets rs ON rs.id = s.current_rate_set_id
  WHERE NOT (rs.params->'maintenance' ? 'lightEveryHours')),
v AS (
  INSERT INTO rate_sets (note, params)
  SELECT 'פיצול התחזוקה: טיפול קל כל 100 שעות ובינוני כל 600 (ADR-060)',
    jsonb_set(params, '{maintenance}', (params->'maintenance') || jsonb_build_object(
      'perAirHourPerMtowT', greatest(0, (params->'maintenance'->>'perAirHourPerMtowT')::numeric - 3.8),
      'lightEveryHours', 100, 'lightPerMtowT', 190, 'mediumEveryHours', 600, 'mediumPerMtowT', 1330))
  FROM cur RETURNING id)
UPDATE settings SET current_rate_set_id = v.id, updated_at = now() FROM v WHERE settings.id = 1;
