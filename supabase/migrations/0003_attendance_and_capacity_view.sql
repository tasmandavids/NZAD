-- ============================================================================
--  Olune · 0003_attendance_and_capacity_view
--  Adds:
--    1. attendance table — teacher roll-call records per class per day
--    2. class_capacity view — live enrolled count per class (replaces mock data)
--
--  Apply after 0002_core_tables_and_rls.sql
-- ============================================================================

-- ============================================================================
--  ATTENDANCE  (one row per student per class per calendar date)
-- ============================================================================
create table if not exists public.attendance (
  id          uuid primary key default gen_random_uuid(),
  studio_id   uuid not null references public.studios(id)   on delete cascade,
  class_id    uuid not null references public.classes(id)   on delete cascade,
  student_id  uuid not null references public.profiles(id)  on delete cascade,
  date        date not null,
  status      text not null default 'present',  -- present | absent | late | excused
  noted_by    uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (class_id, student_id, date)
);

create index if not exists attendance_class_date_idx on public.attendance(class_id, date);
create index if not exists attendance_student_idx    on public.attendance(student_id);
create index if not exists attendance_studio_idx     on public.attendance(studio_id);

alter table public.attendance enable row level security;

grant select, insert, update, delete on public.attendance to authenticated;

-- Teachers: read + write attendance for their own classes
drop policy if exists "attendance_teacher_own_classes" on public.attendance;
create policy "attendance_teacher_own_classes" on public.attendance
  for all
  using (
    studio_id = public.current_studio()
    and public.current_user_role() = 'teacher'
    and public.teaches_class(class_id)
  )
  with check (
    studio_id = public.current_studio()
    and public.current_user_role() = 'teacher'
    and public.teaches_class(class_id)
  );

-- Admins: full access within studio
drop policy if exists "attendance_admin_all" on public.attendance;
create policy "attendance_admin_all" on public.attendance
  for all
  using (studio_id = public.current_studio() and public.current_user_role() = 'admin')
  with check (studio_id = public.current_studio() and public.current_user_role() = 'admin');

-- Students: read their own attendance
drop policy if exists "attendance_student_read_own" on public.attendance;
create policy "attendance_student_read_own" on public.attendance
  for select
  using (studio_id = public.current_studio() and student_id = auth.uid());

-- Parents: read attendance for their children
drop policy if exists "attendance_parent_read_children" on public.attendance;
create policy "attendance_parent_read_children" on public.attendance
  for select
  using (
    studio_id = public.current_studio()
    and public.current_user_role() = 'parent'
    and public.is_my_child(student_id)
  );

-- ============================================================================
--  CLASS_CAPACITY VIEW
--  Joins classes + active enrollments → live enrolled count per class.
--  security_invoker = on → underlying table RLS is enforced for the caller,
--  so admins see only their studio's classes (via classes_member_read policy).
-- ============================================================================
create or replace view public.class_capacity
  with (security_invoker = on)
as
select
  c.id,
  c.studio_id,
  c.name,
  c.teacher_id,
  c.discipline,
  c.level,
  c.day_of_week,   -- 0 = Sunday … 6 = Saturday (JS Date.getDay() convention)
  c.start_time,
  c.end_time,
  c.capacity,
  coalesce(
    count(e.id) filter (where e.status = 'active'),
    0
  )::int as enrolled
from public.classes c
left join public.enrollments e
  on e.class_id = c.id and e.studio_id = c.studio_id
group by c.id;

grant select on public.class_capacity to authenticated;
