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
