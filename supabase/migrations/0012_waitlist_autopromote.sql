-- ============================================================================
--  0012_waitlist_autopromote.sql   (Phase 2.4)
--  Auto-promote the next waitlisted student when an ACTIVE spot frees up.
--
--  Fires on:
--    • DELETE of an enrollment row (admin hard-unenroll path)
--    • UPDATE where status moves AWAY from 'active' (e.g. 'active' → 'dropped')
--
--  When a spot frees, the oldest 'waitlisted' student (by enrolled_at) is
--  promoted to 'active' — repeated until the class is full or the waitlist is
--  empty — and a 'waitlist_promoted' notification is queued for each.
--
--  Recursion-safe: promoting a row fires this trigger again, but the inner
--  invocation sees old.status = 'waitlisted' (not 'active') and returns early.
--
--  Apply after 0008_notifications.sql.
-- ============================================================================

create or replace function public.promote_waitlist()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_class_id    uuid := old.class_id;
  v_studio_id   uuid := old.studio_id;
  v_capacity    int;
  v_class_name  text;
  v_active      int;
  v_next        public.enrollments%rowtype;
begin
  -- A spot only frees if the row that just left was 'active'.
  if old.status is distinct from 'active' then
    return coalesce(new, old);
  end if;

  -- On UPDATE, if it's still 'active' nothing actually freed.
  if tg_op = 'UPDATE' and new.status = 'active' then
    return new;
  end if;

  select capacity, name
    into v_capacity, v_class_name
    from public.classes
    where id = v_class_id;

  if v_capacity is null then
    return coalesce(new, old);
  end if;

  select count(*) into v_active
    from public.enrollments
    where class_id = v_class_id and status = 'active';

  -- Promote oldest waitlisted students until the class is full.
  while v_active < v_capacity loop
    select * into v_next
      from public.enrollments
      where class_id = v_class_id and status = 'waitlisted'
      order by enrolled_at asc
      limit 1;

    exit when v_next.id is null;

    update public.enrollments
      set status = 'active'
      where id = v_next.id;

    insert into public.notifications(studio_id, user_id, type, title, body, link)
    values (
      v_studio_id,
      v_next.student_id,
      'waitlist_promoted',
      'A spot opened in ' || coalesce(v_class_name, 'your class'),
      'You''ve been moved off the waitlist and are now enrolled. See you there!',
      '/portal/student'
    );

    v_active := v_active + 1;
  end loop;

  return coalesce(new, old);
end;
$$;

drop trigger if exists waitlist_promote_trigger on public.enrollments;
create trigger waitlist_promote_trigger
  after update or delete on public.enrollments
  for each row
  execute function public.promote_waitlist();
