-- ============================================================================
--  0015_sibling_discount.sql   (Phase 3.3)
--  Configurable family / sibling discount.
--
--  sibling_discount_pct is a whole-number percentage (0–100) applied to a
--  paid enrollment when the paying family already has at least one other
--  ACTIVE student enrolled. 0 = disabled (default).
--
--  Apply after 0001_tenant_branding.sql.
-- ============================================================================

alter table public.studios
  add column if not exists sibling_discount_pct int not null default 0
    check (sibling_discount_pct between 0 and 100);
