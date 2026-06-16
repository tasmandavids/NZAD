-- ============================================================================
--  0011_student_progress.sql
--  Per-student progress log: instructor notes, skill level, certifications.
--  Visible to admins (whole studio) and the teaching instructor (their own
--  students via teaches_student()). Students/parents can read their own.
-- ============================================================================

create table if not exists public.student_progress (
  id             uuid primary key default gen_random_uuid(),
  studio_id      uuid not null references public.studios(id) on delete cascade,
  student_id     uuid not null references public.profiles(id) on delete cascade,
  instructor_id  uuid references public.profiles(id) on delete set null,
  notes          text,
  level          text,
  certifications jsonb not null default '[]'::jsonb,
  logged_at      timestamptz not null default now()
);

create index if not exists student_progress_student_idx
  on public.student_progress(student_id, logged_at desc);
create index if not exists student_progress_studio_idx
  on public.student_progress(studio_id);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table public.student_progress enable row level security;

-- Admins: full access within their studio.
drop policy if exists "progress_admin_all" on public.student_progress;
create policy "progress_admin_all" on public.student_progress
  for all using (
    studio_id = public.current_studio()
    and public.current_user_role() = 'admin'
  )
  with check (
    studio_id = public.current_studio()
    and public.current_user_role() = 'admin'
  );

-- Teachers: read + log progress for students they teach.
drop policy if exists "progress_teacher_read" on public.student_progress;
create policy "progress_teacher_read" on public.student_progress
  for select using (
    studio_id = public.current_studio()
    and public.teaches_student(student_id)
  );

drop policy if exists "progress_teacher_insert" on public.student_progress;
create policy "progress_teacher_insert" on public.student_progress
  for insert with check (
    studio_id = public.current_studio()
    and public.teaches_student(student_id)
    and instructor_id = auth.uid()
  );

-- Students: read their own progress.
drop policy if exists "progress_student_read" on public.student_progress;
create policy "progress_student_read" on public.student_progress
  for select using (student_id = auth.uid());

-- Parents: read their child's progress.
drop policy if exists "progress_parent_read" on public.student_progress;
create policy "progress_parent_read" on public.student_progress
  for select using (public.is_my_child(student_id));

grant select, insert, update, delete on public.student_progress to authenticated;
