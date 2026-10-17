-- Fuel on board (sketch s15, ADR-062): each flight pays for the fuel it burned.

-- The fuel record of a closed flight: what was in the tanks, what was bought, what was left at GATE,
-- and what that left is worth. The next flight of the same registration starts from it.
-- { start_kg, start_usd, start_from, bought_kg, bought_usd, remain_kg, remain_usd, burned_kg, cost_usd, avg_usd_per_kg, plan_kg }
-- NULL on flights closed before this: their fuel line is the GSX bill, as it was.
ALTER TABLE flights ADD COLUMN fuel_state jsonb;
CREATE INDEX flights_registration_in ON flights (registration, (coalesce(in_at, closed_at)) DESC) WHERE status = 'closed';

-- The fuel bought at the gate, in kg, entered during the flight next to its price.
ALTER TABLE flight_drafts ADD COLUMN fuel_kg numeric(12,1);
