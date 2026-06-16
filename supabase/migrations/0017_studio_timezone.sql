-- ============================================================================
--  0017_studio_timezone.sql   (Session 8 · Priority 1)
--  Per-studio timezone so the notifications cron computes "tomorrow" (class
--  reminders), "today" (birthdays) and overdue cut-offs in each studio's local
--  time rather than UTC.
--
--  IANA timezone name (e.g. 'Pacific/Auckland', 'Australia/Sydney',
--  'America/New_York'). Defaults to NZ to match the studio-wide NZD/GST setup.
--
--  Apply after 0001_tenant_branding.sql.
-- ============================================================================

alter table public.studios
  add column if not exists timezone text not null default 'Pacific/Auckland';
