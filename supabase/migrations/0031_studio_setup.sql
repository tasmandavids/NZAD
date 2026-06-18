-- ============================================================================
--  0031_studio_setup.sql
--  Post-onboarding setup wizard: studio profile, import path, completion.
-- ============================================================================

alter table public.studios
  add column if not exists setup_completed_at timestamptz,
  add column if not exists setup_path          text check (setup_path in ('scratch', 'import')),
  add column if not exists import_source       text,
  add column if not exists location_city       text,
  add column if not exists location_region     text,
  add column if not exists location_country    text default 'New Zealand',
  add column if not exists about               text,
  add column if not exists dance_styles        text[] default '{}';

create index if not exists studios_setup_incomplete_idx
  on public.studios (id)
  where setup_completed_at is null;

-- Existing studios skip the wizard; only new sign-ups after this migration see it.
update public.studios
  set setup_completed_at = coalesce(setup_completed_at, created_at)
  where setup_completed_at is null;
