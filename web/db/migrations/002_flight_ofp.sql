-- WP5: time zones like +5:30 need fractions; keep the OFP summary the flight was built from.
ALTER TABLE flights ALTER COLUMN orig_utc_offset TYPE numeric(4,2);
ALTER TABLE flights ADD COLUMN ofp_doc jsonb;
