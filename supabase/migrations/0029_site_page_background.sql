-- ============================================================================
--  0029 — Page canvas background for the freeform site builder.
--  Stores per-page background settings (colour, image, video) as JSON.
-- ============================================================================

alter table public.site_pages
  add column if not exists background jsonb not null default '{}'::jsonb;
