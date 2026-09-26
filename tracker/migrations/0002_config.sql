-- Account ids pushed by the app from its settings screen (fixes ADR-044's
-- "CID only in wrangler.toml"). Env vars remain the fallback.
CREATE TABLE config (
  id          INTEGER PRIMARY KEY CHECK (id = 1),
  vatsim_cid  INTEGER,
  simbrief_id TEXT,
  updated_at  TEXT NOT NULL
);
