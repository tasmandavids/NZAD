-- Adult self-managed students: self-enroll, self-waiver, self-billing.

alter table public.profiles
  add column if not exists self_managed boolean not null default false;

create or replace function public.is_self_managed_student()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'student'
      and self_managed = true
  );
$$;

-- Self-managed student enrollment.
drop policy if exists "enroll_student_self_insert" on public.enrollments;
create policy "enroll_student_self_insert" on public.enrollments
  for insert with check (
    studio_id = public.current_studio()
    and public.is_self_managed_student()
    and student_id = auth.uid()
    and exists (
      select 1 from public.classes c
      where c.id = class_id and c.studio_id = public.current_studio()
    )
  );

-- Self-managed student invoices.
drop policy if exists "inv_student_insert_own" on public.invoices;
create policy "inv_student_insert_own" on public.invoices
  for insert with check (
    studio_id = public.current_studio()
    and public.is_self_managed_student()
    and payer_id = auth.uid()
    and student_id = auth.uid()
  );

drop policy if exists "inv_student_update_own_sent" on public.invoices;
create policy "inv_student_update_own_sent" on public.invoices
  for update
  using (
    payer_id = auth.uid()
    and public.is_self_managed_student()
    and status in ('draft', 'sent')
  )
  with check (payer_id = auth.uid());

-- Self-managed student waiver signatures.
drop policy if exists "waiver_sigs_student_self_insert" on public.waiver_signatures;
create policy "waiver_sigs_student_self_insert" on public.waiver_signatures
  for insert with check (
    signed_by = auth.uid()
    and student_id = auth.uid()
    and public.is_self_managed_student()
    and exists (
      select 1 from public.waivers w
      where w.id = waiver_id and w.studio_id = public.current_studio()
    )
  );

-- Parents may create child student profiles (no login until invited).
drop policy if exists "profiles_parent_insert_child" on public.profiles;
create policy "profiles_parent_insert_child" on public.profiles
  for insert with check (
    studio_id = public.current_studio()
    and public.current_user_role() = 'parent'
    and role = 'student'
    and self_managed = false
  );

drop policy if exists "guardianships_parent_insert" on public.guardianships;
create policy "guardianships_parent_insert" on public.guardianships
  for insert with check (
    studio_id = public.current_studio()
    and guardian_id = auth.uid()
    and public.current_user_role() = 'parent'
    and exists (
      select 1 from public.profiles p
      where p.id = student_id
        and p.studio_id = public.current_studio()
        and p.role = 'student'
    )
  );

-- Open registration with optional self_managed flag for adult students.
create or replace function public.register_studio_member(
  p_studio_slug text,
  p_role public.user_role,
  p_self_managed boolean default false,
  p_birthday date default null
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

  if p_self_managed and p_role <> 'student' then
    raise exception 'self_managed only applies to student role';
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
        active_studio_id = v_studio.id,
        self_managed = case when p_role = 'student' then p_self_managed else false end,
        birthday = coalesce(p_birthday, birthday)
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

grant execute on function public.register_studio_member(text, public.user_role, boolean, date) to authenticated;
