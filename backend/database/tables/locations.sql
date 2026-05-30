CREATE TABLE IF NOT EXISTS locations (
    location_id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    housenumber VARCHAR(50),
    street VARCHAR(255),
    city VARCHAR(100),
    postcode VARCHAR(20),
    country VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common search patterns and spatial lookups
CREATE INDEX IF NOT EXISTS idx_locations_city ON locations(city);
CREATE INDEX IF NOT EXISTS idx_locations_postcode ON locations(postcode);
CREATE INDEX IF NOT EXISTS idx_locations_coords ON locations(latitude, longitude);