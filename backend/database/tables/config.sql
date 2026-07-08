CREATE TABLE IF NOT EXISTS config_model (
    config_id SERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL UNIQUE,

    default_start_address INTEGER NULL,

    default_end_address INTEGER NULL,

    break_time INTEGER NOT NULL DEFAULT 0,

    subscription_type VARCHAR(50) DEFAULT 'trial',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_config_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_config_default_start_address
        FOREIGN KEY (default_start_address)
        REFERENCES locations(location_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_config_default_end_address
        FOREIGN KEY (default_end_address)
        REFERENCES locations(location_id)
        ON DELETE SET NULL,

    CONSTRAINT break_time_non_negative
        CHECK (break_time >= 0),

    CONSTRAINT break_time_max_limit
        CHECK (break_time <= 86400)
);

-- Migration query to add column to existing tables and transition legacy users to 'trial':
ALTER TABLE config_model ADD COLUMN IF NOT EXISTS subscription_type VARCHAR(50) DEFAULT 'trial';

INSERT INTO config_model (user_id)
SELECT user_id
FROM users
ON CONFLICT (user_id) DO NOTHING;