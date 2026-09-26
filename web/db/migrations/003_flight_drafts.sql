-- GSX costs entered during the flight, before the completion form (user request 2026-09-26).
-- One row per OFP; the completion form starts from it, closing or discarding deletes it.
CREATE TABLE flight_drafts (
  ofp_id      text PRIMARY KEY,
  fuel        numeric(12,2),
  ground      numeric(12,2),
  catering    numeric(12,2),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
