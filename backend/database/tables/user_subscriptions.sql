CREATE TABLE IF NOT EXISTS user_subscriptions (
  subscription_id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider VARCHAR(30) NOT NULL,
  plan_code VARCHAR(30) NOT NULL,
  product_id VARCHAR(150) NOT NULL,
  purchase_token TEXT NOT NULL,
  order_id VARCHAR(200),
  status VARCHAR(80) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  auto_renew BOOLEAN NOT NULL DEFAULT FALSE,
  started_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
  last_verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_subscriptions_provider_token_unique
    UNIQUE (provider, purchase_token)
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id
  ON user_subscriptions (user_id);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_active_expiry
  ON user_subscriptions (user_id, is_active, expires_at DESC);
