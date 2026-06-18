-- ============================================================================
--  Olune · migration 0026_platform_admin
--  Platform-level operator console for the Olune apex site (olune.app).
--  Manages studios, owner comms, feature flags, ops tasks, and audit trail.
-- ============================================================================

-- ---------------------------------------------------------------------------
--  PLATFORM OPERATORS — Olune staff with cross-tenant access.
--  Bootstrap via PLATFORM_OPERATOR_EMAILS env or insert rows here.
-- ---------------------------------------------------------------------------
create table if not exists public.platform_operators (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  title       text,
  permissions jsonb not null default '["*"]'::jsonb,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
--  PLATFORM SETTINGS — singleton JSON config (maintenance mode, defaults…)
-- ---------------------------------------------------------------------------
create table if not exists public.platform_settings (
  id         int primary key default 1 check (id = 1),
  settings   jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

insert into public.platform_settings (id, settings)
values (1, '{
  "maintenanceMode": false,
  "defaultTrialDays": 14,
  "supportEmail": "support@olune.app",
  "signupEnabled": true,
  "welcomeMessage": "Welcome to Olune — your studio platform."
}'::jsonb)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
--  FEATURE FLAGS — global or per-studio toggles.
-- ---------------------------------------------------------------------------
create table if not exists public.platform_feature_flags (
  id          uuid primary key default gen_random_uuid(),
  feature_key text not null,
  label       text not null,
  description text,
  studio_id   uuid references public.studios(id) on delete cascade,
  enabled     boolean not null default false,
  metadata    jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id) on delete set null,
  unique (feature_key, studio_id)
);

-- Seed default platform features (global scope: studio_id IS NULL)
insert into public.platform_feature_flags (feature_key, label, description, studio_id, enabled)
values
  ('shop',           'Shop module',           'Merchandise catalog and checkout', null, true),
  ('events',         'Events & tickets',      'Recitals and ticket sales',        null, true),
  ('subscriptions',  'Auto-pay subscriptions','Stripe recurring class billing',   null, true),
  ('site_builder',   'Website builder',       'Multi-page block-based site',      null, true),
  ('sms_notify',     'SMS notifications',     'Twilio outbound SMS delivery',     null, false),
  ('custom_domain',  'Custom domains',        'Allow studios to map own domain',  null, true),
  ('ai_assistant',   'AI assistant (beta)',   'In-portal AI help for admins',     null, false)
on conflict do nothing;

-- ---------------------------------------------------------------------------
--  ANNOUNCEMENTS — broadcast to studio owners (shown in admin portal).
-- ---------------------------------------------------------------------------
create table if not exists public.platform_announcements (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  body         text not null,
  severity     text not null default 'info' check (severity in ('info','warning','critical')),
  target       text not null default 'all' check (target in ('all','trial','active','suspended')),
  published_at timestamptz,
  expires_at   timestamptz,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists platform_announcements_published_idx
  on public.platform_announcements (published_at desc nulls last);

-- ---------------------------------------------------------------------------
--  SUPPORT THREADS — Olune ↔ studio owner conversations.
-- ---------------------------------------------------------------------------
create table if not exists public.platform_support_threads (
  id          uuid primary key default gen_random_uuid(),
  studio_id   uuid not null references public.studios(id) on delete cascade,
  subject     text not null,
  status      text not null default 'open' check (status in ('open','pending','resolved')),
  priority    text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  created_by  uuid references auth.users(id) on delete set null,
  assigned_to uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists platform_support_threads_studio_idx
  on public.platform_support_threads (studio_id);
create index if not exists platform_support_threads_status_idx
  on public.platform_support_threads (status, updated_at desc);

create table if not exists public.platform_support_messages (
  id                   uuid primary key default gen_random_uuid(),
  thread_id            uuid not null references public.platform_support_threads(id) on delete cascade,
  body                 text not null,
  sender_operator_id   uuid references auth.users(id) on delete set null,
  sender_profile_id    uuid references public.profiles(id) on delete set null,
  created_at           timestamptz not null default now(),
  check (
    (sender_operator_id is not null and sender_profile_id is null)
    or (sender_operator_id is null and sender_profile_id is not null)
  )
);
create index if not exists platform_support_messages_thread_idx
  on public.platform_support_messages (thread_id, created_at);

-- ---------------------------------------------------------------------------
--  OPS TASKS — internal Olune backend work queue.
-- ---------------------------------------------------------------------------
create table if not exists public.platform_tasks (
  id           uuid primary key default gen_random_uuid(),
  task_type    text not null,
  title        text not null,
  description  text,
  studio_id    uuid references public.studios(id) on delete set null,
  status       text not null default 'todo' check (status in ('todo','in_progress','blocked','done')),
  priority     text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  due_at       timestamptz,
  assigned_to  uuid references auth.users(id) on delete set null,
  metadata     jsonb not null default '{}'::jsonb,
  created_by   uuid references auth.users(id) on delete set null,
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists platform_tasks_status_idx
  on public.platform_tasks (status, priority, due_at nulls last);

-- ---------------------------------------------------------------------------
--  AUDIT LOG — immutable record of platform operator actions.
-- ---------------------------------------------------------------------------
create table if not exists public.platform_audit_log (
  id          uuid primary key default gen_random_uuid(),
  operator_id uuid references auth.users(id) on delete set null,
  action      text not null,
  target_type text,
  target_id   text,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists platform_audit_log_created_idx
  on public.platform_audit_log (created_at desc);

-- ---------------------------------------------------------------------------
--  OWNER NOTES — private Olune notes about a studio / owner relationship.
-- ---------------------------------------------------------------------------
create table if not exists public.platform_owner_notes (
  id          uuid primary key default gen_random_uuid(),
  studio_id   uuid not null references public.studios(id) on delete cascade unique,
  notes       text not null default '',
  tags        text[] not null default '{}',
  updated_by  uuid references auth.users(id) on delete set null,
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
--  HELPERS
-- ---------------------------------------------------------------------------
create or replace function public.is_platform_operator()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.platform_operators where user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
--  ROW-LEVEL SECURITY
-- ---------------------------------------------------------------------------
alter table public.platform_operators        enable row level security;
alter table public.platform_settings         enable row level security;
alter table public.platform_feature_flags    enable row level security;
alter table public.platform_announcements    enable row level security;
alter table public.platform_support_threads  enable row level security;
alter table public.platform_support_messages enable row level security;
alter table public.platform_tasks            enable row level security;
alter table public.platform_audit_log        enable row level security;
alter table public.platform_owner_notes      enable row level security;

-- Operators read/write all platform tables
do $$ declare t text; begin
  foreach t in array array[
    'platform_settings',
    'platform_feature_flags',
    'platform_announcements',
    'platform_support_threads',
    'platform_support_messages',
    'platform_tasks',
    'platform_audit_log',
    'platform_owner_notes'
  ] loop
    execute format('drop policy if exists "operators manage %1$s" on public.%1$s', t);
    execute format(
      'create policy "operators manage %1$s" on public.%1$s for all to authenticated using (public.is_platform_operator()) with check (public.is_platform_operator())',
      t
    );
  end loop;
end $$;

-- Operators manage the roster; any user may read their own row (for middleware auth).
drop policy if exists "operators manage platform_operators" on public.platform_operators;
create policy "operators manage platform_operators" on public.platform_operators
  for all to authenticated
  using (public.is_platform_operator())
  with check (public.is_platform_operator());

drop policy if exists "users read own operator row" on public.platform_operators;
create policy "users read own operator row" on public.platform_operators
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- Studio admins read published announcements for their status
drop policy if exists "admins read published announcements" on public.platform_announcements;
create policy "admins read published announcements" on public.platform_announcements
  for select to authenticated
  using (
    published_at is not null
    and published_at <= now()
    and (expires_at is null or expires_at > now())
    and public.current_user_role() = 'admin'
    and (
      target = 'all'
      or target = (select status from public.studios where id = public.current_studio())
    )
  );

-- Studio admins read/write their own support threads
drop policy if exists "admins read own support threads" on public.platform_support_threads;
create policy "admins read own support threads" on public.platform_support_threads
  for select to authenticated
  using (studio_id = public.current_studio() and public.current_user_role() = 'admin');

drop policy if exists "admins create support threads" on public.platform_support_threads;
create policy "admins create support threads" on public.platform_support_threads
  for insert to authenticated
  with check (studio_id = public.current_studio() and public.current_user_role() = 'admin');

drop policy if exists "admins read own support messages" on public.platform_support_messages;
create policy "admins read own support messages" on public.platform_support_messages
  for select to authenticated
  using (
    exists (
      select 1 from public.platform_support_threads t
      where t.id = thread_id
        and t.studio_id = public.current_studio()
        and public.current_user_role() = 'admin'
    )
  );

drop policy if exists "admins send support messages" on public.platform_support_messages;
create policy "admins send support messages" on public.platform_support_messages
  for insert to authenticated
  with check (
    sender_profile_id = auth.uid()
    and exists (
      select 1 from public.platform_support_threads t
      where t.id = thread_id
        and t.studio_id = public.current_studio()
        and public.current_user_role() = 'admin'
    )
  );

-- Operators get cross-tenant read on studios (for the console)
drop policy if exists "operators read all studios" on public.studios;
create policy "operators read all studios" on public.studios
  for select to authenticated
  using (public.is_platform_operator());

drop policy if exists "operators update all studios" on public.studios;
create policy "operators update all studios" on public.studios
  for update to authenticated
  using (public.is_platform_operator())
  with check (public.is_platform_operator());

-- Operators read profiles across tenants (owner directory)
drop policy if exists "operators read all profiles" on public.profiles;
create policy "operators read all profiles" on public.profiles
  for select to authenticated
  using (public.is_platform_operator());
