-- Adds the recipient contact and short-lived OTP verification state used when
-- DELIVERY_OTP_PROOF_ENABLED is the active delivery confirmation system.

BEGIN;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS recipient_email VARCHAR(320),
  ADD COLUMN IF NOT EXISTS delivery_otp_hash VARCHAR(255),
  ADD COLUMN IF NOT EXISTS delivery_otp_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivery_otp_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivery_otp_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivery_otp_attempts INTEGER NOT NULL DEFAULT 0;

ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_delivery_otp_attempts_check;

ALTER TABLE orders
  ADD CONSTRAINT orders_delivery_otp_attempts_check
  CHECK (delivery_otp_attempts BETWEEN 0 AND 5);

CREATE INDEX IF NOT EXISTS orders_delivery_otp_expiry_idx
  ON orders (delivery_otp_expires_at)
  WHERE delivery_otp_hash IS NOT NULL;

COMMIT;
