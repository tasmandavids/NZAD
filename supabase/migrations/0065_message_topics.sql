-- Separate parent → studio admin threads by enquiry topic (billing, absence, general).

alter table public.messages
  add column if not exists topic text
    check (topic is null or topic in ('billing', 'absence', 'general'));

create index if not exists messages_thread_topic_idx
  on public.messages(
    studio_id,
    least(from_user_id, to_user_id),
    greatest(from_user_id, to_user_id),
    topic,
    sent_at desc
  );

-- Legacy parent ↔ admin/office threads without a topic appear under General.
create or replace function private.notify_message_received()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_sender_name text;
  v_recipient_role public.user_role;
  v_link text;
  v_topic_query text := '';
begin
  select coalesce(nullif(trim(full_name), ''), email)
    into v_sender_name
    from public.profiles where id = new.from_user_id;

  select role into v_recipient_role
    from public.profiles where id = new.to_user_id;

  if new.topic is not null then
    v_topic_query := '&topic=' || new.topic;
  end if;

  v_link := case v_recipient_role
    when 'parent'  then '/portal/parent/chat?with=' || new.from_user_id::text || v_topic_query
    when 'student' then '/portal/student/messages?with=' || new.from_user_id::text
    when 'teacher' then '/portal/teacher/messages?with=' || new.from_user_id::text
    when 'office'  then '/portal/admin/messages?with=' || new.from_user_id::text || v_topic_query
    else '/portal/admin/messages?with=' || new.from_user_id::text || v_topic_query
  end;

  insert into public.notifications(studio_id, user_id, type, title, body, link, payload)
  values (
    new.studio_id,
    new.to_user_id,
    'message_received',
    'New message from ' || coalesce(v_sender_name, 'Someone'),
    left(new.body, 120),
    v_link,
    jsonb_build_object('from_user_id', new.from_user_id, 'topic', new.topic)
  );
  return new;
end;
$$;
