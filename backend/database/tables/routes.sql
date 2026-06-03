CREATE TABLE IF NOT EXISTS routes (
    route_id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL, -- Assuming UUID for user_id, adjust if different
    name VARCHAR(255) NOT NULL,
    start_full_address TEXT NOT NULL,
    end_full_address TEXT NOT NULL,
    start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- e.g., 'pending', 'active', 'completed', 'cancelled'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_user FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE
);