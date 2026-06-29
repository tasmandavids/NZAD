-- Fix auth_rls_initplan warnings: wrap auth.uid() in (select auth.uid()) so
-- Postgres evaluates it once per query instead of once per row.

-- ─── studio_memberships ──────────────────────────────────────────────────────

drop policy if exists "memberships_read_own" on public.studio_memberships;
create policy "memberships_read_own" on public.studio_memberships
  for select to authenticated
  using (user_id = (select auth.uid()));

-- ─── classes ─────────────────────────────────────────────────────────────────

drop policy if exists "classes_teacher_assigned" on public.classes;
create policy "classes_teacher_assigned" on public.classes
  for select to authenticated
  using (teacher_id = (select auth.uid()));

drop policy if exists "classes_teacher_assigned_write" on public.classes;
create policy "classes_teacher_assigned_write" on public.classes
  for all to authenticated
  using (
    teacher_id = (select auth.uid())
    and private.current_user_role() = 'teacher'
  )
  with check (
    teacher_id = (select auth.uid())
    and private.current_user_role() = 'teacher'
  );

-- ─── student_progress ────────────────────────────────────────────────────────

drop policy if exists "progress_teacher_assigned_insert" on public.student_progress;
create policy "progress_teacher_assigned_insert" on public.student_progress
  for insert to authenticated
  with check (
    private.teaches_student(student_id)
    and instructor_id = (select auth.uid())
  );

-- ─── enrollments ─────────────────────────────────────────────────────────────

drop policy if exists "enroll_student_self_insert" on public.enrollments;
create policy "enroll_student_self_insert" on public.enrollments
  for insert with check (
    studio_id = private.current_studio()
    and public.is_self_managed_student()
    and student_id = (select auth.uid())
    and exists (
      select 1 from public.classes c
      where c.id = class_id and c.studio_id = private.current_studio()
    )
  );

-- ─── invoices ────────────────────────────────────────────────────────────────

drop policy if exists "inv_student_insert_own" on public.invoices;
create policy "inv_student_insert_own" on public.invoices
  for insert with check (
    studio_id = private.current_studio()
    and public.is_self_managed_student()
    and payer_id = (select auth.uid())
    and student_id = (select auth.uid())
  );

drop policy if exists "inv_student_update_own_sent" on public.invoices;
create policy "inv_student_update_own_sent" on public.invoices
  for update
  using (
    payer_id = (select auth.uid())
    and public.is_self_managed_student()
    and status in ('draft', 'sent')
  )
  with check (payer_id = (select auth.uid()));

-- ─── waiver_signatures ───────────────────────────────────────────────────────

drop policy if exists "waiver_sigs_student_self_insert" on public.waiver_signatures;
create policy "waiver_sigs_student_self_insert" on public.waiver_signatures
  for insert with check (
    signed_by = (select auth.uid())
    and student_id = (select auth.uid())
    and public.is_self_managed_student()
    and exists (
      select 1 from public.waivers w
      where w.id = waiver_id and w.studio_id = private.current_studio()
    )
  );

-- ─── guardianships ───────────────────────────────────────────────────────────

drop policy if exists "guardianships_parent_insert" on public.guardianships;
create policy "guardianships_parent_insert" on public.guardianships
  for insert with check (
    studio_id = private.current_studio()
    and guardian_id = (select auth.uid())
    and private.current_user_role() = 'parent'
    and exists (
      select 1 from public.profiles p
      where p.id = student_id
        and p.studio_id = private.current_studio()
        and p.role = 'student'
    )
  );

-- ─── term_payment_plans ──────────────────────────────────────────────────────

drop policy if exists "term_plans_payer_read" on public.term_payment_plans;
create policy "term_plans_payer_read" on public.term_payment_plans
  for select using (payer_id = (select auth.uid()));

drop policy if exists "term_plans_payer_insert" on public.term_payment_plans;
create policy "term_plans_payer_insert" on public.term_payment_plans
  for insert with check (payer_id = (select auth.uid()));

drop policy if exists "term_plans_payer_update_own" on public.term_payment_plans;
create policy "term_plans_payer_update_own" on public.term_payment_plans
  for update using (payer_id = (select auth.uid()));

-- ─── term_payment_plan_invoices ──────────────────────────────────────────────

drop policy if exists "term_plan_invoices_payer_read" on public.term_payment_plan_invoices;
create policy "term_plan_invoices_payer_read" on public.term_payment_plan_invoices
  for select using (
    exists (
      select 1 from public.term_payment_plans p
      where p.id = plan_id and p.payer_id = (select auth.uid())
    )
  );

drop policy if exists "term_plan_invoices_payer_insert" on public.term_payment_plan_invoices;
create policy "term_plan_invoices_payer_insert" on public.term_payment_plan_invoices
  for insert with check (
    exists (
      select 1 from public.term_payment_plans p
      where p.id = plan_id and p.payer_id = (select auth.uid())
    )
  );

-- ─── student_schedule_entries ────────────────────────────────────────────────

drop policy if exists "schedule_teacher_write" on public.student_schedule_entries;
create policy "schedule_teacher_write" on public.student_schedule_entries
  for insert with check (
    studio_id = private.current_studio()
    and private.teaches_student(student_id)
    and created_by = (select auth.uid())
  );

drop policy if exists "schedule_student_read" on public.student_schedule_entries;
create policy "schedule_student_read" on public.student_schedule_entries
  for select using (student_id = (select auth.uid()));

-- ─── instructor_availability ─────────────────────────────────────────────────

drop policy if exists "availability_own" on public.instructor_availability;
create policy "availability_own" on public.instructor_availability
  for all using (instructor_id = (select auth.uid()));

drop policy if exists "availability_admin_read" on public.instructor_availability;
create policy "availability_admin_read" on public.instructor_availability
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'admin'
        and p.studio_id in (
          select studio_id from public.studio_memberships
          where user_id = instructor_availability.instructor_id
        )
    )
  );

-- ─── substitute_requests ─────────────────────────────────────────────────────

drop policy if exists "sub_requests_teacher_read" on public.substitute_requests;
create policy "sub_requests_teacher_read" on public.substitute_requests
  for select using (
    status = 'open'
    and (
      studio_id = private.current_studio()
      or exists (
        select 1 from public.studio_memberships sm
        where sm.user_id = (select auth.uid())
          and sm.studio_id = substitute_requests.studio_id
          and sm.status = 'active'
      )
    )
  );

drop policy if exists "sub_requests_teacher_claim" on public.substitute_requests;
create policy "sub_requests_teacher_claim" on public.substitute_requests
  for update using (status = 'open')
  with check (
    filled_by = (select auth.uid())
    and status = 'filled'
  );

-- ─── notification_preferences ────────────────────────────────────────────────

drop policy if exists "notif_prefs_own" on public.notification_preferences;
create policy "notif_prefs_own" on public.notification_preferences
  for all using (user_id = (select auth.uid()));

-- ─── instructor_documents ────────────────────────────────────────────────────

drop policy if exists "instructor_docs_own" on public.instructor_documents;
create policy "instructor_docs_own" on public.instructor_documents
  for all using (instructor_id = (select auth.uid()));

drop policy if exists "instructor_docs_admin_read" on public.instructor_documents;
create policy "instructor_docs_admin_read" on public.instructor_documents
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'admin'
        and p.studio_id in (
          select studio_id from public.studio_memberships
          where user_id = instructor_documents.instructor_id
        )
    )
  );

-- ─── instructor_expenses ─────────────────────────────────────────────────────

drop policy if exists "instructor_expenses_own" on public.instructor_expenses;
create policy "instructor_expenses_own" on public.instructor_expenses
  for all using (instructor_id = (select auth.uid()));

-- ─── private_clients ─────────────────────────────────────────────────────────

drop policy if exists "private_clients_own" on public.private_clients;
create policy "private_clients_own" on public.private_clients
  for all using (instructor_id = (select auth.uid()));

-- ─── contractor_invoices ─────────────────────────────────────────────────────

drop policy if exists "contractor_invoices_own" on public.contractor_invoices;
create policy "contractor_invoices_own" on public.contractor_invoices
  for all using (instructor_id = (select auth.uid()));
