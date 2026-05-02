-- ============================================================================
-- Clasd — Migration 6
-- Polar paywall support: track pending checkouts so we can find the
-- subscription on success redirect.
-- ============================================================================

-- Pending checkout ID lives on profiles. Single value because a user can
-- only have one in-flight checkout at a time.
alter table profiles
  add column if not exists pending_checkout_id text;

-- The plan, polar_customer_id, polar_subscription_id columns already exist
-- from migration 1. Nothing else to add — we just need the workflow code.
