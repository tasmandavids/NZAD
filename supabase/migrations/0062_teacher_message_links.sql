-- Role-aware notification links: teachers open their own messages inbox.

create or replace function private.notify_message_received()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_sender_name text;
  v_recipient_role public.user_role;
  v_link text;
begin
  select coalesce(nullif(trim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')), ''), email, full_name)
    into v_sender_name
    from public.profiles where id = new.from_user_id;

  select role into v_recipient_role
    from public.profiles where id = new.to_user_id;

  v_link := case v_recipient_role
    when 'parent'  then '/portal/parent/chat?with=' || new.from_user_id::text
    when 'student' then '/portal/student/messages?with=' || new.from_user_id::text
    when 'teacher' then '/portal/teacher/messages?with=' || new.from_user_id::text
    when 'office'  then '/portal/admin/messages?with=' || new.from_user_id::text
    else '/portal/admin/messages?with=' || new.from_user_id::text
  end;

  insert into public.notifications(studio_id, user_id, type, title, body, link, payload)
  values (
    new.studio_id,
    new.to_user_id,
    'message_received',
    'New message from ' || coalesce(v_sender_name, 'Someone'),
    left(new.body, 120),
    v_link,
    jsonb_build_object('from_user_id', new.from_user_id)
  );
  return new;
end;
$$;
