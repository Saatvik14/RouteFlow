-- Adds cross-business public route listings and independent-driver bids.
-- Public listings intentionally expose route-level data only; customer stops
-- remain protected by the existing tenant access rules.

BEGIN;

ALTER TABLE routes
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS marketplace_status VARCHAR(16) NOT NULL DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS max_driver_cost NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS cost_currency CHAR(3),
  ADD COLUMN IF NOT EXISTS bidding_closes_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS marketplace_published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS marketplace_closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS awarded_cost NUMERIC(12, 2);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'routes_marketplace_status_check'
  ) THEN
    ALTER TABLE routes ADD CONSTRAINT routes_marketplace_status_check
      CHECK (marketplace_status IN ('private', 'open', 'awarded', 'withdrawn', 'closed'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'routes_marketplace_cost_check'
  ) THEN
    ALTER TABLE routes ADD CONSTRAINT routes_marketplace_cost_check
      CHECK (
        (marketplace_status = 'private' AND is_public = FALSE)
        OR (
          max_driver_cost IS NOT NULL
          AND max_driver_cost > 0
          AND cost_currency IS NOT NULL
          AND bidding_closes_at IS NOT NULL
        )
      );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS route_bids (
  bid_id BIGSERIAL PRIMARY KEY,
  route_id INTEGER NOT NULL REFERENCES routes(route_id) ON DELETE CASCADE,
  bidder_user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  amount NUMERIC(12, 2) NOT NULL,
  currency CHAR(3) NOT NULL,
  message VARCHAR(500),
  status VARCHAR(16) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at TIMESTAMPTZ,
  decided_by_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  withdrawn_at TIMESTAMPTZ,
  CONSTRAINT route_bids_amount_check CHECK (amount > 0),
  CONSTRAINT route_bids_status_check
    CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn', 'expired')),
  CONSTRAINT route_bids_one_per_driver UNIQUE (route_id, bidder_user_id)
);

ALTER TABLE routes
  ADD COLUMN IF NOT EXISTS awarded_bid_id BIGINT REFERENCES route_bids(bid_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS routes_open_marketplace_idx
  ON routes (start_datetime ASC, bidding_closes_at ASC)
  WHERE is_public = TRUE AND marketplace_status = 'open' AND driver_id IS NULL;
CREATE INDEX IF NOT EXISTS route_bids_route_status_idx
  ON route_bids (route_id, status, amount ASC, created_at ASC);
CREATE INDEX IF NOT EXISTS route_bids_driver_status_idx
  ON route_bids (bidder_user_id, status, created_at DESC);

COMMIT;
