-- Olune · seed.sql — sample data for a studio you've already created.
--
-- NOTE: with the onboarding wizard, you no longer need this to bootstrap a
-- studio/admin — just hit /onboarding. Use this only to drop in sample
-- teachers/students/classes/invoices so the dashboard and RLS have data.
--
-- 1) In Supabase Studio → Authentication → Users → "Add user", create the
--    users you want (a teacher, a parent, a student), auto-confirm them.
-- 2) Paste their UUIDs + your existing studio's id below.
-- 3) Run in Studio → SQL editor (runs privileged, so it bypasses the
--    profile role-change guard).

do $$
declare
  v_studio  uuid := '00000000-0000-0000-0000-000000000000'; -- ← your studio id
  v_teacher uuid := '00000000-0000-0000-0000-000000000002'; -- ← a teacher user
  v_parent  uuid := '00000000-0000-0000-0000-000000000003'; -- ← a parent user
  v_student uuid := '00000000-0000-0000-0000-000000000004'; -- ← a student (dancer)
  v_c1 uuid; v_c2 uuid;
begin
  update public.profiles set studio_id = v_studio, role = 'teacher', full_name = 'Theo Teacher' where id = v_teacher;
  update public.profiles set studio_id = v_studio, role = 'parent',  full_name = 'Pat Parent'   where id = v_parent;
  update public.profiles set studio_id = v_studio, role = 'student', full_name = 'Sam Student'   where id = v_student;

  insert into public.guardianships (studio_id, guardian_id, student_id, is_primary)
    values (v_studio, v_parent, v_student, true) on conflict do nothing;

  -- one class scheduled TODAY (so "Classes today" > 0) + one other day
  insert into public.classes (studio_id, teacher_id, name, discipline, level, day_of_week, start_time, capacity, price_cents)
    values (v_studio, v_teacher, 'Ballet Jr', 'Ballet', 'Grade 2', extract(dow from now())::int, '15:30', 16, 2200)
    returning id into v_c1;
  insert into public.classes (studio_id, teacher_id, name, discipline, level, day_of_week, start_time, capacity, price_cents)
    values (v_studio, v_teacher, 'Hip-Hop Teens', 'Hip-Hop', 'Teens', 3, '17:30', 22, 2000)
    returning id into v_c2;

  insert into public.enrollments (studio_id, student_id, class_id, status)
    values (v_studio, v_student, v_c1, 'active') on conflict do nothing;

  -- a paid invoice THIS MONTH (so "Revenue this month" > 0)
  insert into public.invoices (studio_id, payer_id, student_id, amount_cents, gst_cents, status, due_date, issued_at, created_at)
    values (v_studio, v_parent, v_student, 22000, 3300, 'paid', current_date + 7, now(), now());
end $$;
