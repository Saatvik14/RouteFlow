CREATE TABLE order_placements (
    placement_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    longitudinal VARCHAR(20) CHECK (longitudinal IN ('front', 'middle', 'back')),
    side VARCHAR(20) CHECK (side IN ('left', 'right')),
    vertical VARCHAR(20) CHECK (vertical IN ('floor', 'shelf')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(order_id)
);
