-- Creates in-app notifications table for dispatch, pool routes, and driver alerts.

BEGIN;

CREATE TABLE IF NOT EXISTS in_app_notifications (
  notification_id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  organization_id INTEGER REFERENCES organizations(organization_id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(64) NOT NULL DEFAULT 'fleet_pool_route',
  data JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_in_app_notifications_user_read
  ON in_app_notifications (user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_in_app_notifications_org
  ON in_app_notifications (organization_id, created_at DESC);

COMMIT;
