-- Smart Logbook Database Schema (PostgreSQL)

-- Flights table
CREATE TABLE IF NOT EXISTS flights (
    id SERIAL PRIMARY KEY,
    date TIMESTAMP NOT NULL,
    origin VARCHAR(10) NOT NULL,
    destination VARCHAR(10) NOT NULL,
    origin_name VARCHAR(100),
    dest_name VARCHAR(100),
    aircraft VARCHAR(20),
    distance INT,
    duration VARCHAR(10),
    duration_mins INT,
    passengers INT DEFAULT 0,
    fuel INT DEFAULT 0,
    payload INT DEFAULT 0,
    fpm INT,
    profit INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Settings table (key-value store)
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pricing history table
CREATE TABLE IF NOT EXISTS pricing_history (
    id SERIAL PRIMARY KEY,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fuel_price DECIMAL(10,4),
    fuel_cost DECIMAL(10,4),
    cost_index INT,
    ticket_base INT,
    ticket_medium INT,
    ticket_long INT,
    cargo_rate DECIMAL(10,4),
    crew_cost INT,
    landing_small INT,
    landing_medium INT,
    landing_large INT,
    maintenance_cost INT,
    penalty INT,
    multiplier DECIMAL(10,4)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_flights_date ON flights(date DESC);
CREATE INDEX IF NOT EXISTS idx_flights_origin_dest ON flights(origin, destination);
CREATE INDEX IF NOT EXISTS idx_pricing_history_date ON pricing_history(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

-- Insert default settings
INSERT INTO settings (key, value) VALUES
('lang', 'he'),
('simbriefId', ''),
('pTicketBase', '120'),
('pTicketMedium', '200'),
('pTicketLong', '350'),
('pCargo', '2.0'),
('pFuel', '0.85'),
('pCrew', '800'),
('pLandingSmall', '150'),
('pLandingMedium', '350'),
('pLandingLarge', '600'),
('pMaint', '180'),
('pPenalty', '1000'),
('goalFlights', '0'),
('goalHours', '0'),
('goalProfit', '0'),
('goalPassengers', '0')
ON CONFLICT (key) DO NOTHING;

COMMIT;
