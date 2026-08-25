-- Migration: Add address to organizations table
BEGIN;

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS address TEXT;

COMMIT;
