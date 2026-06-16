-- ============================================================================
--  0019 — Family discount on retail (shop orders + event tickets)   (Session 9)
--
--  The sibling/family discount (migration 0015) applies to tuition: enrollment
--  PaymentIntents and auto-pay subscriptions. Extending it to merchandise and
--  one-off event tickets is a separate business decision, so it is OPT-IN per
--  studio via this flag. When enabled AND the buyer already has >=1 active
--  enrolled student, the studio's existing `sibling_discount_pct` is applied to
--  shop orders and event-ticket purchases too.
-- ============================================================================

alter table public.studios
  add column if not exists family_discount_on_retail boolean not null default false;
