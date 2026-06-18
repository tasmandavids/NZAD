-- Paste into Supabase Dashboard → SQL Editor (runs 0026 + 0027)
-- Then run: npm run seed:platform-admin

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

-- ============================================================================
--  0027_studio_member_registration.sql
--  Studio-scoped member registration (parent / student / teacher).
--  Separate from owner onboarding (create_studio_for_user on apex domain).
--
--  Note: uses UUID concatenation for invite tokens — no pgcrypto required.
--  If you have a local 0026_studio_member_registration.sql that failed on
--  gen_random_bytes(), delete it and use this migration instead.
-- ============================================================================

-- ─── Invites (admin-provisioned links for teachers, optional for others) ───
create table if not exists public.studio_invites (
  id          uuid primary key default gen_random_uuid(),
  studio_id   uuid not null references public.studios(id) on delete cascade,
  email       text not null,
  role        public.user_role not null check (role in ('teacher', 'parent', 'student')),
  token       text not null unique default replace(
                  gen_random_uuid()::text || gen_random_uuid()::text,
                  '-',
                  ''
                ),
  invited_by  uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  expires_at  timestamptz not null default (now() + interval '14 days'),
  created_at  timestamptz not null default now()
);

create index if not exists studio_invites_studio_idx on public.studio_invites (studio_id);
create index if not exists studio_invites_token_idx on public.studio_invites (token);
create unique index if not exists studio_invites_pending_email_idx
  on public.studio_invites (studio_id, lower(email), role)
  where accepted_at is null;

-- ─── Per-studio registration settings ───────────────────────────────────────
alter table public.studios
  add column if not exists registration_enabled boolean not null default false;

alter table public.studios
  add column if not exists registration_roles text[] not null default '{parent,student}';

-- ─── Accept an invite (called after sign-up / sign-in) ──────────────────────
create or replace function public.accept_studio_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.studio_invites%rowtype;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select * into v_invite
  from public.studio_invites
  where token = p_token
    and accepted_at is null
    and expires_at > now()
  for update;

  if not found then
    raise exception 'invite invalid or expired';
  end if;

  if (select studio_id from public.profiles where id = v_uid) is not null then
    raise exception 'user already belongs to a studio';
  end if;

  update public.profiles
  set studio_id = v_invite.studio_id,
      role = v_invite.role,
      email = coalesce(email, v_invite.email)
  where id = v_uid;

  update public.studio_invites
  set accepted_at = now()
  where id = v_invite.id;

  return v_invite.studio_id;
end;
$$;

-- ─── Open registration (studio subdomain, no invite token) ────────────────
create or replace function public.register_studio_member(
  p_studio_slug text,
  p_role public.user_role
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_studio public.studios%rowtype;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if p_role not in ('teacher', 'parent', 'student') then
    raise exception 'invalid role for self-registration';
  end if;

  select * into v_studio
  from public.studios
  where slug = lower(p_studio_slug)
    and status <> 'suspended';

  if not found then
    raise exception 'studio not found';
  end if;

  if not v_studio.registration_enabled then
    raise exception 'registration is closed for this studio';
  end if;

  if not (p_role::text = any (v_studio.registration_roles)) then
    raise exception 'role not allowed for open registration';
  end if;

  if (select studio_id from public.profiles where id = v_uid) is not null then
    raise exception 'user already belongs to a studio';
  end if;

  update public.profiles
  set studio_id = v_studio.id,
      role = p_role
  where id = v_uid;

  return v_studio.id;
end;
$$;

-- ─── Row-level security ─────────────────────────────────────────────────────
alter table public.studio_invites enable row level security;

drop policy if exists "admins manage studio invites" on public.studio_invites;
create policy "admins manage studio invites" on public.studio_invites
  for all to authenticated
  using (
    studio_id = public.current_studio()
    and public.current_user_role() = 'admin'
  )
  with check (
    studio_id = public.current_studio()
    and public.current_user_role() = 'admin'
  );

drop policy if exists "invitee reads own pending invite by token" on public.studio_invites;
create policy "invitee reads own pending invite by token" on public.studio_invites
  for select to authenticated
  using (
    accepted_at is null
    and expires_at > now()
    and lower(email) = lower(coalesce(
      (select email from public.profiles where id = auth.uid()),
      (select email from auth.users where id = auth.uid())
    ))
  );

-- Grant execute on registration RPCs to authenticated users.
grant execute on function public.accept_studio_invite(text) to authenticated;
grant execute on function public.register_studio_member(text, public.user_role) to authenticated;
