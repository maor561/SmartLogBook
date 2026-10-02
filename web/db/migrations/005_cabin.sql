-- The cabin in flight (sketch s14, ADR-061).

-- What the tracker measured in the air and what it meant for the service, stored when the flight
-- closes: { tier, served_share, climb_fpm, descent_fpm, belt_off_at, toc_at, tod_at, belt_on_at, top_alt_ft }.
-- NULL on flights closed before this, on manual and partial flights, and on aircraft without a cabin
-- picture: those keep the three-part flight score.
ALTER TABLE flights ADD COLUMN cabin jsonb;
