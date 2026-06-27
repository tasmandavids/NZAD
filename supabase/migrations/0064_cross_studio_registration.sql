-- Allow parents and students to register at additional studios via memberships
-- while keeping their primary profile studio unchanged.

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
  elsif p_role in ('parent', 'student') then
    if exists (
      select 1 from public.studio_memberships
      where user_id = v_uid
        and studio_id = v_studio.id
        and status = 'active'
    ) then
      raise exception 'already registered at this studio';
    end if;

    insert into public.studio_memberships (user_id, studio_id, role, is_primary, linked_via, status)
    values (v_uid, v_studio.id, p_role, false, 'registration', 'active')
    on conflict (user_id, studio_id) do update
      set role = excluded.role, status = 'active', linked_via = 'registration';

    update public.profiles
    set active_studio_id = v_studio.id,
        self_managed = case
          when p_role = 'student' and p_self_managed then true
          else self_managed
        end,
        birthday = coalesce(p_birthday, birthday)
    where id = v_uid;
  else
    raise exception 'user already belongs to a studio';
  end if;

  return v_studio.id;
end;
$$;

grant execute on function public.register_studio_member(text, public.user_role, boolean, date) to authenticated;
