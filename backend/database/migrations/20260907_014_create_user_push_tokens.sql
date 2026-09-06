-- Creates user_push_tokens table for Expo Push Notifications (iOS / Android)

BEGIN;

CREATE TABLE IF NOT EXISTS user_push_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  push_token TEXT NOT NULL,
  platform VARCHAR(32) DEFAULT 'mobile',
  device_id TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_push_token UNIQUE (user_id, push_token)
);

CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user_id
  ON user_push_tokens (user_id);

COMMIT;
