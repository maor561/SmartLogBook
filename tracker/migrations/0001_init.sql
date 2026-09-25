-- Live tracking state (ADR-024, DATA_MODEL "D1"). One row: the active flight.
-- The machine state is a JSON document (src/machine.js IDLE shape), so the
-- schema doesn't change every time the machine gains a field.
CREATE TABLE tracker (
  id          INTEGER PRIMARY KEY CHECK (id = 1),
  data        TEXT NOT NULL,
  ofp_checked_at TEXT,
  updated_at  TEXT NOT NULL
);

-- Transition log for debugging; cleared when the app acknowledges the flight.
-- No position track is kept (ADR-022).
CREATE TABLE tracker_events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  at         TEXT NOT NULL,
  from_state TEXT NOT NULL,
  to_state   TEXT NOT NULL,
  reason     TEXT
);
