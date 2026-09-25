-- SmartLogBook 2.0 — initial schema (docs/DATA_MODEL.md, ADR-007/021/030/033/038/041)

CREATE TABLE rate_sets (
  id          serial PRIMARY KEY,
  created_at  timestamptz NOT NULL DEFAULT now(),
  note        text,
  params      jsonb NOT NULL
);
-- Versions are immutable (ADR-021): a change is always a new row.
CREATE FUNCTION rate_sets_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'rate_sets rows are immutable; insert a new version'; END $$;
CREATE TRIGGER rate_sets_no_update BEFORE UPDATE OR DELETE ON rate_sets
  FOR EACH ROW EXECUTE FUNCTION rate_sets_immutable();

CREATE TABLE settings (
  id                   smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  simbrief_id          text,
  vatsim_cid           integer,
  home_base_icao       char(4) NOT NULL DEFAULT 'LLBG',
  current_rate_set_id  integer NOT NULL REFERENCES rate_sets(id),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- Password stays in APP_PASSWORD_HASH (ADR-041); this row only holds the durable lockout.
CREATE TABLE users (
  id               smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  failed_attempts  integer NOT NULL DEFAULT 0,
  locked_until     timestamptz
);
INSERT INTO users DEFAULT VALUES;

CREATE TABLE airports (
  icao          char(4) PRIMARY KEY,
  name          text NOT NULL,
  city          text,
  country       char(2),
  lat           double precision NOT NULL,
  lon           double precision NOT NULL,
  elevation_ft  integer,
  type          text NOT NULL
);
CREATE INDEX airports_lat_lon ON airports (lat, lon);

CREATE TABLE eia_prices (
  week         date PRIMARY KEY,
  usd_per_kg   numeric(8,4) NOT NULL,
  fetched_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TYPE flight_status AS ENUM ('awaiting_completion', 'closed', 'historical');
CREATE TYPE flight_source AS ENUM ('tracked', 'partial', 'manual', 'historical');

CREATE TABLE flights (
  id                      serial PRIMARY KEY,
  callsign                text,
  ofp_id                  text UNIQUE,
  ofp_generated_at        timestamptz,
  status                  flight_status NOT NULL,
  source                  flight_source NOT NULL,
  origin_icao             char(4) NOT NULL,
  dest_planned_icao       char(4) NOT NULL,
  dest_actual_icao        char(4),
  alternate_icao          char(4),
  route_distance_nm       integer,
  gc_distance_nm          integer,
  aircraft_type           text,
  registration            text,
  seats                   integer,
  mtow_kg                 integer,
  mlw_kg                  integer,
  oew_kg                  integer,
  pax                     integer,
  cargo_kg                integer,      -- weights.freight_added (ADR-039)
  payload_kg              integer,
  sched_out               timestamptz,
  sched_off               timestamptz,
  sched_on                timestamptz,
  sched_in                timestamptz,
  out_at                  timestamptz,
  off_at                  timestamptz,
  on_at                   timestamptz,
  in_at                   timestamptz,
  times_source            char(4),      -- per OUT/OFF/ON/IN: v = VATSIM, m = manual
  block_min               integer GENERATED ALWAYS AS ((extract(epoch FROM (in_at - out_at)) / 60)::integer) STORED,
  air_min                 integer GENERATED ALWAYS AS ((extract(epoch FROM (on_at - off_at)) / 60)::integer) STORED,
  fpm                     integer,
  landing_lat             double precision,
  landing_lon             double precision,
  crew_location_icao      char(4),
  rate_set_id             integer REFERENCES rate_sets(id),
  eia_fuel_price_per_kg   numeric(8,4),
  local_out_hour          smallint,
  orig_utc_offset         smallint,
  rating_at_out           numeric(3,2),
  closed_at               timestamptz,
  edited_at               timestamptz,
  legacy_planned_air_min  integer,
  legacy_doc              jsonb,
  created_at              timestamptz NOT NULL DEFAULT now(),
  -- Every non-historical flight is priced against a rate version, locked at OUT (ADR-021, 025).
  CHECK (status = 'historical' OR rate_set_id IS NOT NULL)
);
CREATE INDEX flights_closed_at ON flights (closed_at);

CREATE TYPE ledger_code AS ENUM (
  'tickets', 'cargo', 'fuel', 'ground_handling', 'catering', 'crew', 'maintenance',
  'airport_fees', 'nav_charges', 'lease', 'hard_landing', 'positioning', 'diversion', 'legacy_profit'
);
CREATE TYPE ledger_source AS ENUM ('simbrief', 'manual', 'auto', 'legacy');

-- Profit = SUM(amount_cents); revenue positive, cost negative (ADR-007).
CREATE TABLE ledger_lines (
  id            bigserial PRIMARY KEY,
  flight_id     integer NOT NULL REFERENCES flights(id) ON DELETE CASCADE,
  code          ledger_code NOT NULL,
  amount_cents  bigint NOT NULL,
  source        ledger_source NOT NULL,
  calc          jsonb
);
CREATE INDEX ledger_lines_flight ON ledger_lines (flight_id);

CREATE TABLE milestones (
  id           serial PRIMARY KEY,
  category     text NOT NULL,
  threshold    bigint NOT NULL,
  achieved_at  timestamptz NOT NULL,
  flight_id    integer REFERENCES flights(id) ON DELETE SET NULL,
  UNIQUE (category, threshold)
);
