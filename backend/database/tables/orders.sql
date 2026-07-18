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

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS arrive_at TIMESTAMP DEFAULT NULL;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS failed_at TIMESTAMP DEFAULT NULL;


ALTER TABLE orders
ADD COLUMN notes TEXT DEFAULT NULL;

ALTER TABLE orders
ADD COLUMN packages INTEGER DEFAULT 1
CHECK (packages >= 0);

ALTER TABLE orders
ADD COLUMN stop_type VARCHAR(50) DEFAULT 'delivery';


-- Fields used by the redesigned Edit stop panel.
-- arrival_time is NULL when the stop can be visited at any time.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS order_preference VARCHAR(10) NOT NULL DEFAULT 'auto';

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS arrival_time TIME NULL;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS time_at_stop_minutes INTEGER NOT NULL DEFAULT 1;

-- Keep existing rows valid before adding constraints.
UPDATE orders
SET order_preference = 'auto'
WHERE order_preference IS NULL
   OR order_preference NOT IN ('early', 'auto', 'last');

UPDATE orders
SET time_at_stop_minutes = 1
WHERE time_at_stop_minutes IS NULL
   OR time_at_stop_minutes < 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_order_preference_check'
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT orders_order_preference_check
      CHECK (order_preference IN ('early', 'auto', 'last'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_time_at_stop_minutes_check'
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT orders_time_at_stop_minutes_check
      CHECK (time_at_stop_minutes >= 1 AND time_at_stop_minutes <= 1440);
  END IF;
END $$;


ALTER TABLE orders
RENAME COLUMN time_at_stop_minutes TO time_at_stop;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS eta_duration DECIMAL(12, 2) DEFAULT NULL;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS eta_distance DECIMAL(12, 6) DEFAULT NULL;