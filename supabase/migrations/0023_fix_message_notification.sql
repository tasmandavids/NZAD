-- ============================================================================
--  0023_fix_message_notification.sql
--  Fix: notify_message_received() (from 0008) referenced profiles.first_name /
--  last_name, which do not exist on public.profiles (the live table comes from
--  0001: id, studio_id, role, full_name, phone, ...). Every INSERT into
--  public.messages therefore failed with 'column "first_name" does not exist',
--  breaking internal messaging entirely. Recreate it using the real column
--  (full_name), with a literal fallback.
-- ============================================================================

create or replace function public.notify_message_received()
returns trigger language plpgsql security definer as $$
declare
  v_sender_name text;
begin
  select full_name
    into v_sender_name
    from public.profiles where id = new.from_user_id;

  insert into public.notifications(studio_id, user_id, type, title, body, link, payload)
  values (
    new.studio_id,
    new.to_user_id,
    'message_received',
    'New message from ' || coalesce(v_sender_name, 'Someone'),
    left(new.body, 120),
    '/portal/admin/messages',
    jsonb_build_object('from_user_id', new.from_user_id)
  );
  return new;
end;
$$;
