-- The fare's fuel surcharge follows the GSX price of the fuel in the tanks (ADR-063).
-- A new rate version (ADR-021) with the surcharge cap raised from 15% to 30%, so an expensive refuel
-- reaches the ticket. Skipped when the current version already allows 30% or more (an empty database
-- is seeded with 30%).
WITH cur AS (
  SELECT rs.params FROM settings s JOIN rate_sets rs ON rs.id = s.current_rate_set_id
  WHERE (rs.params->'fuel'->>'maxPct')::numeric < 30),
v AS (
  INSERT INTO rate_sets (note, params)
  SELECT 'תוספת הדלק לפי מחיר GSX, תקרה 30% (ADR-063)',
    jsonb_set(params, '{fuel,maxPct}', '30'::jsonb)
  FROM cur RETURNING id)
UPDATE settings SET current_rate_set_id = v.id, updated_at = now() FROM v WHERE settings.id = 1;
