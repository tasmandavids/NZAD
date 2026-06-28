-- Copy the auth email into profiles on account creation so that parent/teacher
-- accounts have profiles.email populated without requiring an extra update.

create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_name text;
begin
  v_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(trim(concat_ws(' ',
      new.raw_user_meta_data ->> 'given_name',
      new.raw_user_meta_data ->> 'family_name'
    )), ''),
    nullif(trim(concat_ws(' ',
      new.raw_user_meta_data #>> '{full_name,givenName}',
      new.raw_user_meta_data #>> '{full_name,familyName}'
    )), '')
  );

  insert into public.profiles (id, full_name, email)
  values (new.id, v_name, new.email)
  on conflict (id) do update
    set email = coalesce(public.profiles.email, excluded.email);

  return new;
end $$;

-- Back-fill existing parent/teacher profiles that are missing an email.
-- Joins against auth.users via the service-role view available in migrations.
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id
  and p.email is null
  and u.email is not null
  and u.email not like '%@students.olune.local';
