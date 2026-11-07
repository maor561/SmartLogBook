-- The fare curve after 17 real flights (ADR-064): F0 66 $ (was 40), K 1.39 (was 1.51), and no
-- load-factor multiplier (the number of passengers comes from SimBrief, not from demand).

-- 1. For every version a closed flight was priced with, the same version with the new curve. The closed
--    flights move to it when they are priced again (the app does that once, ADR-064), so each keeps every
--    other parameter it had (maintenance, fuel cap…). Written before the new current version, so the newest
--    version is always the current one.
WITH target AS (SELECT '{"f0": 66, "k": 1.39}'::jsonb AS fare, '{"a": 1, "b": 0}'::jsonb AS lf),
used AS (
  SELECT DISTINCT rs.id, rs.params FROM rate_sets rs JOIN flights f ON f.rate_set_id = rs.id, target t
  WHERE f.status = 'closed'
    AND ((rs.params->'fare'->>'f0')::numeric <> 66 OR (rs.params->'fare'->>'k')::numeric <> 1.39
      OR (rs.params->'loadFactor'->>'a')::numeric <> 1 OR (rs.params->'loadFactor'->>'b')::numeric <> 0))
INSERT INTO rate_sets (note, params)
SELECT 'גרסה ' || u.id || ' עם עקומת המחיר של ADR-064, לחישוב מחדש של טיסות סגורות',
  jsonb_set(jsonb_set(jsonb_set(jsonb_set(u.params, '{fare,f0}', '66'), '{fare,k}', '1.39'), '{loadFactor,a}', '1'), '{loadFactor,b}', '0')
FROM used u ORDER BY u.id;

-- 2. The new current version. Skipped when the current one already has the curve (an empty database is seeded with it).
WITH cur AS (
  SELECT rs.params FROM settings s JOIN rate_sets rs ON rs.id = s.current_rate_set_id
  WHERE (rs.params->'fare'->>'f0')::numeric <> 66 OR (rs.params->'fare'->>'k')::numeric <> 1.39
     OR (rs.params->'loadFactor'->>'a')::numeric <> 1 OR (rs.params->'loadFactor'->>'b')::numeric <> 0),
v AS (
  INSERT INTO rate_sets (note, params)
  SELECT 'עקומת מחיר חדשה: F0 66, K 1.39, בלי מכפיל תפוסה (ADR-064)',
    jsonb_set(jsonb_set(jsonb_set(jsonb_set(params, '{fare,f0}', '66'), '{fare,k}', '1.39'), '{loadFactor,a}', '1'), '{loadFactor,b}', '0')
  FROM cur RETURNING id)
UPDATE settings SET current_rate_set_id = v.id, updated_at = now() FROM v WHERE settings.id = 1;
