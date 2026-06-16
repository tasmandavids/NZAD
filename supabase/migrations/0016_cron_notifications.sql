-- ============================================================================
--  0016_cron_notifications.sql   (Phase 4.3)
--
--  Supports the time-based notification cron (/api/cron/notifications):
--    • adds profiles.birthday so birthday greetings can be generated
--  Also fixes the latent enrollment_confirmed trigger from 0008, which
--  referenced a non-existent column (new.user_id) and a status value that
--  never occurs (status = 'enrolled' — enrollments use 'active').
--
--  Apply after 0008_notifications.sql.
-- ============================================================================

-- ─── birthday for birthday-greeting notifications ────────────────────────────
alter table public.profiles
  add column if not exists birthday date;

-- ─── fix: enrollment confirmed trigger ───────────────────────────────────────
-- enrollments(student_id, class_id, status='active'); studio_id lives on the
-- enrollment row itself, so we don't need to look it up from profiles.
create or replace function public.notify_enrollment_confirmed()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_class_name text;
begin
  select c.name into v_class_name
    from public.classes c where c.id = new.class_id;

  insert into public.notifications(studio_id, user_id, type, title, body, link)
  values (
    new.studio_id,
    new.student_id,
    'enrollment_confirmed',
    'Enrolled in ' || coalesce(v_class_name, 'class'),
    'You have been successfully enrolled. See you there!',
    '/portal/student'
  );

  return new;
end;
$$;

drop trigger if exists enrollment_notify_trigger on public.enrollments;
create trigger enrollment_notify_trigger
  after insert on public.enrollments
  for each row
  when (new.status = 'active')
  execute function public.notify_enrollment_confirmed();
