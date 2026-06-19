-- ============================================================================
--  0049 — Office role client-ops RLS
--
--  Extends studio-admin policies to admin + office via private.is_studio_admin(),
--  aligned with lib/portal/office-access.ts. HR tables (staff_members pay fields)
--  remain admin-only; office gets studio-wide shift reads for the roster view.
-- ============================================================================

-- profiles (parents, students, staff directory for client ops)
drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all" on public.profiles
  for all using (
    studio_id = private.current_studio()
    and private.is_studio_admin()
  )
  with check (
    studio_id = private.current_studio()
    and private.is_studio_admin()
  );

-- guardianships
drop policy if exists "guard_admin_all" on public.guardianships;
create policy "guard_admin_all" on public.guardianships
  for all using (
    studio_id = private.current_studio()
    and private.is_studio_admin()
  )
  with check (
    studio_id = private.current_studio()
    and private.is_studio_admin()
  );

-- enrollments
drop policy if exists "enroll_admin_all" on public.enrollments;
create policy "enroll_admin_all" on public.enrollments
  for all using (
    studio_id = private.current_studio()
    and private.is_studio_admin()
  )
  with check (
    studio_id = private.current_studio()
    and private.is_studio_admin()
  );

-- leads
drop policy if exists "leads_admin_all" on public.leads;
create policy "leads_admin_all" on public.leads
  for all using (
    studio_id = private.current_studio()
    and private.is_studio_admin()
  );

drop policy if exists "leads_staff_read" on public.leads;
create policy "leads_staff_read" on public.leads
  for select using (
    studio_id = private.current_studio()
    and private.current_user_role() in ('admin', 'teacher', 'office')
  );

-- messages
drop policy if exists "messages_admin_all" on public.messages;
create policy "messages_admin_all" on public.messages
  for all using (
    studio_id = private.current_studio()
    and private.is_studio_admin()
  );

-- office dashboard: studio-wide shift roster (names come from profiles policy above)
drop policy if exists "staff_shifts_office_read" on public.staff_shifts;
create policy "staff_shifts_office_read" on public.staff_shifts
  for select using (
    studio_id = private.current_studio()
    and private.current_user_role() = 'office'
  );
