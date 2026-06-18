-- Extract display names from Google / Apple OAuth metadata on signup.

create or replace function public.handle_new_user()
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

  insert into public.profiles (id, full_name)
  values (new.id, v_name)
  on conflict (id) do nothing;
  return new;
end $$;
