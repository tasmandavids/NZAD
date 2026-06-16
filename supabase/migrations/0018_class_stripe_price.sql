-- ============================================================================
--  0018_class_stripe_price.sql   (Session 8 · Priority 3)
--  Reusable Stripe Product/Price per class for auto-pay subscriptions.
--
--  Previously createEnrollmentSubscription created a NEW Stripe Product on every
--  subscription, cluttering the dashboard. We now create one reusable Product +
--  monthly Price per class and store their ids here. stripe_price_cents records
--  the amount the cached Price was created for so we can detect a tuition change
--  and mint a fresh (immutable) Price when needed.
--
--  Apply after 0002_core_tables_and_rls.sql.
-- ============================================================================

alter table public.classes
  add column if not exists stripe_product_id text,
  add column if not exists stripe_price_id   text,
  add column if not exists stripe_price_cents int;
