-- ============================================================================
--  0032_setup_progress.sql
--  Persist wizard step + allow snoozing to dashboard before completion.
-- ============================================================================

alter table public.studios
  add column if not exists setup_step       text,
  add column if not exists setup_snoozed_at timestamptz;
