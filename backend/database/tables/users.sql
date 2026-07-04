CREATE TABLE users (
  user_id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone_no TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE, -- Optional, but must be unique if provided
  password TEXT NOT NULL, -- This will store the hashed password
  role TEXT DEFAULT 'user', -- Default role is 'user'
  status TEXT DEFAULT 'active', -- Default status
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  subscription_type VARCHAR(50) DEFAULT 'trial'
);

-- Migration query to add column to existing tables and transition legacy users to 'free':
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_type VARCHAR(50) DEFAULT 'trial';
-- UPDATE users SET subscription_type = 'free';

-- Indices for performance optimization
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Function to update 'updated_at' column automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();