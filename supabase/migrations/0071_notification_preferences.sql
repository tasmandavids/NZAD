-- ============================================================================
--  0071_notification_preferences.sql
--  Per-user notification delivery opt-in/out per notification type.
--  In-app delivery is always on and cannot be disabled.
-- ============================================================================

create table if not exists public.notification_preferences (
  user_id             uuid not null references public.profiles(id) on delete cascade,
  notification_type   text not null,
  email_enabled       boolean not null default true,
  sms_enabled         boolean not null default true,
  updated_at          timestamptz not null default now(),
  primary key (user_id, notification_type)
);

alter table public.notification_preferences enable row level security;

drop policy if exists "notif_prefs_own" on public.notification_preferences;
create policy "notif_prefs_own" on public.notification_preferences
  for all using (user_id = auth.uid());

grant select, insert, update, delete on public.notification_preferences to authenticated;
