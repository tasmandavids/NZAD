-- ============================================================================
--  0061 — Student schedule entries (staff-managed) + parent notifications
-- ============================================================================

do $$ begin
  create type public.student_schedule_entry_type as enum (
    'private_lesson',
    'rehearsal',
    'makeup',
    'competition',
    'event',
    'note',
    'other'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.student_schedule_entries (
  id            uuid primary key default gen_random_uuid(),
  studio_id     uuid not null references public.studios(id) on delete cascade,
  student_id    uuid not null references public.profiles(id) on delete cascade,
  title         text not null,
  description   text,
  entry_date    date not null,
  start_time    time,
  end_time      time,
  entry_type    public.student_schedule_entry_type not null default 'other',
  location_name text,
  created_by    uuid references public.profiles(id) on delete set null,
  cancelled_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists student_schedule_student_date_idx
  on public.student_schedule_entries (student_id, entry_date);

create index if not exists student_schedule_studio_date_idx
  on public.student_schedule_entries (studio_id, entry_date);

drop trigger if exists student_schedule_entries_updated_at on public.student_schedule_entries;
create trigger student_schedule_entries_updated_at
  before update on public.student_schedule_entries
  for each row execute function public.touch_updated_at();

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table public.student_schedule_entries enable row level security;

drop policy if exists "schedule_admin_all" on public.student_schedule_entries;
create policy "schedule_admin_all" on public.student_schedule_entries
  for all using (
    studio_id = private.current_studio()
    and private.is_studio_admin()
  )
  with check (
    studio_id = private.current_studio()
    and private.is_studio_admin()
  );

drop policy if exists "schedule_teacher_read" on public.student_schedule_entries;
create policy "schedule_teacher_read" on public.student_schedule_entries
  for select using (
    studio_id = private.current_studio()
    and private.teaches_student(student_id)
  );

drop policy if exists "schedule_teacher_write" on public.student_schedule_entries;
create policy "schedule_teacher_write" on public.student_schedule_entries
  for insert with check (
    studio_id = private.current_studio()
    and private.teaches_student(student_id)
    and created_by = auth.uid()
  );

drop policy if exists "schedule_teacher_update" on public.student_schedule_entries;
create policy "schedule_teacher_update" on public.student_schedule_entries
  for update using (
    studio_id = private.current_studio()
    and private.teaches_student(student_id)
  )
  with check (
    studio_id = private.current_studio()
    and private.teaches_student(student_id)
  );

drop policy if exists "schedule_parent_read" on public.student_schedule_entries;
create policy "schedule_parent_read" on public.student_schedule_entries
  for select using (private.is_my_child(student_id));

drop policy if exists "schedule_student_read" on public.student_schedule_entries;
create policy "schedule_student_read" on public.student_schedule_entries
  for select using (student_id = auth.uid());

grant select, insert, update on public.student_schedule_entries to authenticated;

-- ─── Notify guardians (and self-managed students) on schedule changes ────────

create or replace function private.notify_student_schedule_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_student_name text;
  v_guardian record;
  v_action text;
  v_body text;
  v_title text;
  v_self_managed boolean;
begin
  if tg_op = 'UPDATE' and new.cancelled_at is not null and old.cancelled_at is null then
    v_action := 'cancelled';
  elsif tg_op = 'INSERT' then
    v_action := 'added';
  elsif tg_op = 'UPDATE' then
    v_action := 'updated';
  else
    return new;
  end if;

  select full_name, coalesce(self_managed, false)
    into v_student_name, v_self_managed
    from public.profiles
    where id = new.student_id;

  v_body := coalesce(new.title, 'Schedule item')
    || ' · ' || to_char(new.entry_date, 'Dy Mon DD');
  if new.start_time is not null then
    v_body := v_body || ' at ' || to_char(new.start_time, 'HH12:MI AM');
  end if;

  v_title := case v_action
    when 'cancelled' then 'Schedule cancelled for ' || coalesce(v_student_name, 'your dancer')
    when 'added' then 'New schedule item for ' || coalesce(v_student_name, 'your dancer')
    else 'Schedule updated for ' || coalesce(v_student_name, 'your dancer')
  end;

  for v_guardian in
    select guardian_id from public.guardianships where student_id = new.student_id
  loop
    insert into public.notifications (studio_id, user_id, type, title, body, link, payload)
    values (
      new.studio_id,
      v_guardian.guardian_id,
      'schedule_updated',
      v_title,
      v_body,
      '/portal/parent/schedule',
      jsonb_build_object(
        'student_id', new.student_id,
        'entry_id', new.id,
        'action', v_action
      )
    );
  end loop;

  if v_self_managed then
    insert into public.notifications (studio_id, user_id, type, title, body, link, payload)
    values (
      new.studio_id,
      new.student_id,
      'schedule_updated',
      v_title,
      v_body,
      '/portal/student',
      jsonb_build_object(
        'student_id', new.student_id,
        'entry_id', new.id,
        'action', v_action
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists student_schedule_notify_insert on public.student_schedule_entries;
create trigger student_schedule_notify_insert
  after insert on public.student_schedule_entries
  for each row
  when (new.cancelled_at is null)
  execute function private.notify_student_schedule_change();

drop trigger if exists student_schedule_notify_update on public.student_schedule_entries;
create trigger student_schedule_notify_update
  after update on public.student_schedule_entries
  for each row
  when (
    old.title is distinct from new.title
    or old.description is distinct from new.description
    or old.entry_date is distinct from new.entry_date
    or old.start_time is distinct from new.start_time
    or old.end_time is distinct from new.end_time
    or old.entry_type is distinct from new.entry_type
    or old.location_name is distinct from new.location_name
    or old.cancelled_at is distinct from new.cancelled_at
  )
  execute function private.notify_student_schedule_change();
