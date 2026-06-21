-- ============================================================================
--  0052_instructor_sole_trader.sql
--  Build 1.5 — sole traders (independent instructors):
--    • instructor workspaces (studios.kind = 'instructor')
--    • multi-studio memberships
--    • cross-studio teacher RLS
--    • onboarding RPC + updated invite/registration flows
-- ============================================================================

-- ─── Account / studio kind ───────────────────────────────────────────────────

alter table public.studios
  add column if not exists kind text not null default 'studio'
    check (kind in ('studio', 'instructor'));

alter table public.profiles
  add column if not exists account_kind text
    check (account_kind is null or account_kind in ('studio_owner', 'instructor'));

alter table public.profiles
  add column if not exists active_studio_id uuid references public.studios(id) on delete set null;

create index if not exists profiles_active_studio_idx on public.profiles(active_studio_id);

-- ─── Multi-studio memberships ─────────────────────────────────────────────────

create table if not exists public.studio_memberships (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  studio_id   uuid not null references public.studios(id) on delete cascade,
  role        public.user_role not null,
  status      text not null default 'active'
                check (status in ('pending', 'active', 'suspended')),
  is_primary  boolean not null default false,
  linked_via  text,
  linked_at   timestamptz not null default now(),
  unique (user_id, studio_id)
);

create index if not exists studio_memberships_user_idx on public.studio_memberships(user_id);
create index if not exists studio_memberships_studio_idx on public.studio_memberships(studio_id);
create unique index if not exists studio_memberships_one_primary_idx
  on public.studio_memberships(user_id)
  where is_primary;

alter table public.studio_memberships enable row level security;

drop policy if exists "memberships_read_own" on public.studio_memberships;
create policy "memberships_read_own" on public.studio_memberships
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "memberships_admin_read" on public.studio_memberships;
create policy "memberships_admin_read" on public.studio_memberships
  for select to authenticated
  using (
    studio_id = private.current_studio()
    and private.current_user_role() = 'admin'
  );

drop policy if exists "memberships_admin_manage" on public.studio_memberships;
create policy "memberships_admin_manage" on public.studio_memberships
  for all to authenticated
  using (
    studio_id = private.current_studio()
    and private.current_user_role() = 'admin'
  )
  with check (
    studio_id = private.current_studio()
    and private.current_user_role() = 'admin'
  );

grant select, insert, update, delete on public.studio_memberships to authenticated;

-- ─── Backfill existing users ────────────────────────────────────────────────

insert into public.studio_memberships (user_id, studio_id, role, is_primary, linked_via, status)
select p.id, p.studio_id, p.role, true, 'migration', 'active'
from public.profiles p
where p.studio_id is not null
on conflict (user_id, studio_id) do nothing;

update public.profiles p
set account_kind = case
  when s.kind = 'instructor' then 'instructor'
  when p.role = 'admin' then 'studio_owner'
  else p.account_kind
end
from public.studios s
where s.id = p.studio_id
  and p.account_kind is null;

update public.profiles
set account_kind = 'studio_owner'
where account_kind is null
  and studio_id is not null
  and role = 'admin';

-- ─── Cross-studio teacher policies ───────────────────────────────────────────

drop policy if exists "classes_teacher_assigned" on public.classes;
create policy "classes_teacher_assigned" on public.classes
  for select to authenticated
  using (teacher_id = auth.uid());

drop policy if exists "classes_teacher_assigned_write" on public.classes;
create policy "classes_teacher_assigned_write" on public.classes
  for all to authenticated
  using (
    teacher_id = auth.uid()
    and private.current_user_role() = 'teacher'
  )
  with check (
    teacher_id = auth.uid()
    and private.current_user_role() = 'teacher'
  );

drop policy if exists "enrollments_teacher_assigned" on public.enrollments;
create policy "enrollments_teacher_assigned" on public.enrollments
  for select to authenticated
  using (
    private.current_user_role() = 'teacher'
    and private.teaches_class(class_id)
  );

drop policy if exists "enroll_teacher_assigned_roster" on public.enrollments;
create policy "enroll_teacher_assigned_roster" on public.enrollments
  for all to authenticated
  using (
    private.current_user_role() = 'teacher'
    and private.teaches_class(class_id)
  )
  with check (
    private.current_user_role() = 'teacher'
    and private.teaches_class(class_id)
  );

drop policy if exists "attendance_teacher_assigned" on public.attendance;
create policy "attendance_teacher_assigned" on public.attendance
  for all to authenticated
  using (
    private.current_user_role() = 'teacher'
    and private.teaches_class(class_id)
  )
  with check (
    private.current_user_role() = 'teacher'
    and private.teaches_class(class_id)
  );

drop policy if exists "profiles_teacher_assigned_students" on public.profiles;
create policy "profiles_teacher_assigned_students" on public.profiles
  for select to authenticated
  using (
    private.current_user_role() = 'teacher'
    and private.teaches_student(id)
  );

drop policy if exists "progress_teacher_assigned_read" on public.student_progress;
create policy "progress_teacher_assigned_read" on public.student_progress
  for select to authenticated
  using (private.teaches_student(student_id));

drop policy if exists "progress_teacher_assigned_insert" on public.student_progress;
create policy "progress_teacher_assigned_insert" on public.student_progress
  for insert to authenticated
  with check (
    private.teaches_student(student_id)
    and instructor_id = auth.uid()
  );

-- ─── Owner onboarding (add kind + membership) ────────────────────────────────

create or replace function public.create_studio_for_user(p_name text, p_slug text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_studio uuid;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if (select studio_id from public.profiles where id = v_uid) is not null then
    raise exception 'user already belongs to a studio';
  end if;

  insert into public.studios (name, slug, status, kind)
    values (p_name, lower(p_slug), 'trial', 'studio')
    returning id into v_studio;

  insert into public.studio_branding (studio_id) values (v_studio);

  update public.profiles
  set studio_id = v_studio,
      role = 'admin',
      account_kind = 'studio_owner',
      active_studio_id = v_studio
  where id = v_uid;

  insert into public.studio_memberships (user_id, studio_id, role, is_primary, linked_via, status)
  values (v_uid, v_studio, 'admin', true, 'owner_created', 'active');

  return v_studio;
end $$;

-- ─── Instructor workspace onboarding ─────────────────────────────────────────

create or replace function public.create_instructor_workspace_for_user(p_name text, p_slug text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_studio uuid;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if (select studio_id from public.profiles where id = v_uid) is not null then
    raise exception 'user already belongs to a studio';
  end if;

  insert into public.studios (name, slug, status, kind)
    values (p_name, lower(p_slug), 'trial', 'instructor')
    returning id into v_studio;

  insert into public.studio_branding (studio_id) values (v_studio);

  update public.profiles
  set studio_id = v_studio,
      role = 'teacher',
      account_kind = 'instructor',
      active_studio_id = v_studio
  where id = v_uid;

  insert into public.studio_memberships (user_id, studio_id, role, is_primary, linked_via, status)
  values (v_uid, v_studio, 'teacher', true, 'owner_created', 'active');

  return v_studio;
end $$;

grant execute on function public.create_instructor_workspace_for_user(text, text) to authenticated;

-- ─── Accept invite (multi-membership for instructors) ────────────────────────

create or replace function public.accept_studio_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.studio_invites%rowtype;
  v_uid uuid := auth.uid();
  v_home_studio uuid;
  v_account_kind text;
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

  select studio_id, account_kind into v_home_studio, v_account_kind
  from public.profiles
  where id = v_uid;

  if v_home_studio is null then
    update public.profiles
    set studio_id = v_invite.studio_id,
        role = v_invite.role,
        account_kind = coalesce(account_kind, 'studio_owner'),
        active_studio_id = v_invite.studio_id,
        email = coalesce(email, v_invite.email)
    where id = v_uid;

    insert into public.studio_memberships (user_id, studio_id, role, is_primary, linked_via, status)
    values (v_uid, v_invite.studio_id, v_invite.role, true, 'invite', 'active')
    on conflict (user_id, studio_id) do update
      set role = excluded.role, status = 'active', linked_via = 'invite';
  elsif v_account_kind = 'instructor' then
    insert into public.studio_memberships (user_id, studio_id, role, is_primary, linked_via, status)
    values (v_uid, v_invite.studio_id, v_invite.role, false, 'invite', 'active')
    on conflict (user_id, studio_id) do update
      set role = excluded.role, status = 'active', linked_via = 'invite';
  else
    raise exception 'user already belongs to a studio';
  end if;

  update public.studio_invites
  set accepted_at = now()
  where id = v_invite.id;

  return v_invite.studio_id;
end;
$$;

-- ─── Open registration (multi-membership for instructors) ────────────────────

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
  v_home_studio uuid;
  v_account_kind text;
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

  select studio_id, account_kind into v_home_studio, v_account_kind
  from public.profiles
  where id = v_uid;

  if v_home_studio is null then
    update public.profiles
    set studio_id = v_studio.id,
        role = p_role,
        active_studio_id = v_studio.id
    where id = v_uid;

    insert into public.studio_memberships (user_id, studio_id, role, is_primary, linked_via, status)
    values (v_uid, v_studio.id, p_role, true, 'registration', 'active')
    on conflict (user_id, studio_id) do update
      set role = excluded.role, status = 'active';
  elsif v_account_kind = 'instructor' and p_role = 'teacher' then
    insert into public.studio_memberships (user_id, studio_id, role, is_primary, linked_via, status)
    values (v_uid, v_studio.id, p_role, false, 'registration', 'active')
    on conflict (user_id, studio_id) do update
      set role = excluded.role, status = 'active', linked_via = 'registration';
  else
    raise exception 'user already belongs to a studio';
  end if;

  return v_studio.id;
end;
$$;

-- ─── JWT hook — active studio + membership role ──────────────────────────────

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  claims      jsonb := event -> 'claims';
  v_uid       uuid := (event ->> 'user_id')::uuid;
  v_active    uuid;
  v_role      public.user_role;
begin
  select coalesce(p.active_studio_id, p.studio_id), p.role
  into v_active, v_role
  from public.profiles p
  where p.id = v_uid;

  if v_active is not null then
    claims := jsonb_set(claims, '{studio_id}', to_jsonb(v_active::text));

    select m.role into v_role
    from public.studio_memberships m
    where m.user_id = v_uid
      and m.studio_id = v_active
      and m.status = 'active';
  end if;

  if v_role is not null then
    claims := jsonb_set(claims, '{user_role}', to_jsonb(v_role::text));
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;
