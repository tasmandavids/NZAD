-- ============================================================================
--  0042 — Guardian relationship labels on guardianships
-- ============================================================================

alter table public.guardianships
  add column if not exists relationship text not null default 'guardian'
    check (relationship in ('mother', 'father', 'guardian', 'other'));
