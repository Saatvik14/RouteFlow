CREATE TABLE IF NOT EXISTS orders (
    order_id SERIAL PRIMARY KEY,
    location_id INTEGER REFERENCES locations(location_id) ON DELETE CASCADE,
    route_id INTEGER REFERENCES routes(route_id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending',
    sequence_no INTEGER DEFAULT NULL,
    priority INTEGER DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for filtering, joining, and ordering
CREATE INDEX IF NOT EXISTS idx_orders_location_id ON orders(location_id);
CREATE INDEX IF NOT EXISTS idx_orders_route_id ON orders(route_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_sequence ON orders(sequence_no);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);


ALTER TABLE orders ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT NULL