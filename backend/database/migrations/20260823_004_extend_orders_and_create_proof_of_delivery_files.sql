-- Extends orders with stop execution and delivery outcome fields.
-- Creates proof_of_delivery_files for protected delivery evidence.
-- Depends on 20260823_003_extend_routes_and_create_assignment_audit_tables.sql.

BEGIN;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS arrived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS skipped_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reschedule_required_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recipient_name VARCHAR(160),
  ADD COLUMN IF NOT EXISTS driver_notes TEXT,
  ADD COLUMN IF NOT EXISTS failure_reason VARCHAR(48),
  ADD COLUMN IF NOT EXISTS completion_latitude DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS completion_longitude DECIMAL(11, 8),
  ADD COLUMN IF NOT EXISTS server_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivery_submission_key VARCHAR(96),
  ADD COLUMN IF NOT EXISTS completion_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE orders
SET
  status = CASE
    WHEN LOWER(COALESCE(status, '')) IN ('delivered', 'complete', 'completed') THEN 'delivered'
    WHEN LOWER(COALESCE(status, '')) = 'failed' THEN 'failed'
    WHEN LOWER(COALESCE(status, '')) = 'arrived' THEN 'arrived'
    WHEN LOWER(COALESCE(status, '')) IN ('skipped', 'cancelled', 'canceled') THEN 'skipped'
    WHEN LOWER(COALESCE(status, '')) IN ('reschedule', 'reschedule_required') THEN 'reschedule_required'
    ELSE 'pending'
  END,
  delivered_at = COALESCE(delivered_at, CASE WHEN LOWER(COALESCE(status, '')) IN ('delivered', 'complete', 'completed') THEN arrive_at END),
  server_completed_at = COALESCE(server_completed_at, CASE WHEN LOWER(COALESCE(status, '')) IN ('delivered', 'complete', 'completed') THEN arrive_at WHEN LOWER(COALESCE(status, '')) = 'failed' THEN failed_at END);

CREATE UNIQUE INDEX IF NOT EXISTS orders_submission_idempotency
  ON orders (order_id, delivery_submission_key)
  WHERE delivery_submission_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS orders_route_status_idx
  ON orders (route_id, status, sequence_no);

CREATE TABLE IF NOT EXISTS proof_of_delivery_files (
  proof_id BIGSERIAL PRIMARY KEY,
  organization_id BIGINT NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  route_id INTEGER NOT NULL REFERENCES routes(route_id) ON DELETE CASCADE,
  order_id INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  uploaded_by_user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  proof_type VARCHAR(16) NOT NULL,
  storage_provider VARCHAR(16) NOT NULL DEFAULT 'database',
  storage_key TEXT,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(96) NOT NULL,
  byte_size INTEGER NOT NULL,
  sha256 CHAR(64) NOT NULL,
  file_content BYTEA,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT proof_of_delivery_type_check
    CHECK (proof_type IN ('photo', 'signature', 'failure_photo')),
  CONSTRAINT proof_of_delivery_provider_check
    CHECK (storage_provider IN ('database', 'supabase')),
  CONSTRAINT proof_of_delivery_size_check
    CHECK (byte_size > 0 AND byte_size <= 8388608)
);

CREATE INDEX IF NOT EXISTS proof_of_delivery_order_idx
  ON proof_of_delivery_files (organization_id, order_id, created_at DESC);

COMMIT;
