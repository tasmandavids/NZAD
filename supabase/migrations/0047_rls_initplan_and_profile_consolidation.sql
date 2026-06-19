-- Fix auth_rls_initplan linter warnings by wrapping auth.uid() in scalar subqueries
-- so Postgres evaluates the caller identity once per query, not per row.
-- Also drop duplicate permissive profile policies that overlap existing ones.

-- ---------------------------------------------------------------------------
-- profiles: remove duplicate policies (keep profiles_update_own / profiles_admin_all)
-- ---------------------------------------------------------------------------
drop policy if exists "update own profile" on public.profiles;
drop policy if exists "admins manage studio profiles" on public.profiles;

drop policy if exists "profiles_read_own" on public.profiles;
create policy "profiles_read_own" on public.profiles
  for select using (id = (select auth.uid()));

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- classes
-- ---------------------------------------------------------------------------
drop policy if exists "classes_teacher_own" on public.classes;
create policy "classes_teacher_own" on public.classes
  for all using (
    studio_id = public.current_studio()
    and public.current_user_role() = 'teacher'
    and teacher_id = (select auth.uid())
  ) with check (
    studio_id = public.current_studio()
    and public.current_user_role() = 'teacher'
    and teacher_id = (select auth.uid())
  );

-- ---------------------------------------------------------------------------
-- enrollments
-- ---------------------------------------------------------------------------
drop policy if exists "enroll_student_read_own" on public.enrollments;
create policy "enroll_student_read_own" on public.enrollments
  for select using (
    studio_id = public.current_studio()
    and student_id = (select auth.uid())
  );

-- ---------------------------------------------------------------------------
-- invoices
-- ---------------------------------------------------------------------------
drop policy if exists "inv_parent_read" on public.invoices;
create policy "inv_parent_read" on public.invoices
  for select using (
    studio_id = public.current_studio()
    and public.current_user_role() = 'parent'
    and (
      payer_id = (select auth.uid())
      or public.is_my_child(student_id)
    )
  );

drop policy if exists "inv_parent_insert_own" on public.invoices;
create policy "inv_parent_insert_own" on public.invoices
  for insert with check (
    studio_id = public.current_studio()
    and payer_id = (select auth.uid())
    and public.is_my_child(student_id)
  );

drop policy if exists "inv_parent_update_own_sent" on public.invoices;
create policy "inv_parent_update_own_sent" on public.invoices
  for update
  using (payer_id = (select auth.uid()) and status in ('draft', 'sent'))
  with check (payer_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- guardianships
-- ---------------------------------------------------------------------------
drop policy if exists "guard_parent_read" on public.guardianships;
create policy "guard_parent_read" on public.guardianships
  for select using (
    studio_id = public.current_studio()
    and guardian_id = (select auth.uid())
  );

drop policy if exists "guard_student_read" on public.guardianships;
create policy "guard_student_read" on public.guardianships
  for select using (
    studio_id = public.current_studio()
    and student_id = (select auth.uid())
  );

-- ---------------------------------------------------------------------------
-- attendance
-- ---------------------------------------------------------------------------
drop policy if exists "attendance_student_read_own" on public.attendance;
create policy "attendance_student_read_own" on public.attendance
  for select using (
    studio_id = public.current_studio()
    and student_id = (select auth.uid())
  );

-- ---------------------------------------------------------------------------
-- payments
-- ---------------------------------------------------------------------------
drop policy if exists "payments_payer_read" on public.payments;
create policy "payments_payer_read" on public.payments
  for select using (payer_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------------
drop policy if exists "messages_participant" on public.messages;
create policy "messages_participant" on public.messages
  for select using (
    studio_id = public.current_studio()
    and (
      from_user_id = (select auth.uid())
      or to_user_id = (select auth.uid())
    )
  );

drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages
  for insert with check (
    studio_id = public.current_studio()
    and from_user_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = to_user_id and p.studio_id = public.current_studio()
    )
  );

drop policy if exists "messages_mark_read" on public.messages;
create policy "messages_mark_read" on public.messages
  for update using (
    studio_id = public.current_studio()
    and to_user_id = (select auth.uid())
  );

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
drop policy if exists "notifications_own" on public.notifications;
create policy "notifications_own" on public.notifications
  for all using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- orders / order_items
-- ---------------------------------------------------------------------------
drop policy if exists "orders_own" on public.orders;
create policy "orders_own" on public.orders
  for all
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and studio_id = public.current_studio()
  );

drop policy if exists "order_items_via_order" on public.order_items;
create policy "order_items_via_order" on public.order_items
  for all using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (
          o.user_id = (select auth.uid())
          or (
            o.studio_id = public.current_studio()
            and public.current_user_role() = 'admin'
          )
        )
    )
  );

-- ---------------------------------------------------------------------------
-- student_progress
-- ---------------------------------------------------------------------------
drop policy if exists "progress_teacher_insert" on public.student_progress;
create policy "progress_teacher_insert" on public.student_progress
  for insert with check (
    studio_id = public.current_studio()
    and public.teaches_student(student_id)
    and instructor_id = (select auth.uid())
  );

drop policy if exists "progress_student_read" on public.student_progress;
create policy "progress_student_read" on public.student_progress
  for select using (student_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- subscriptions / line items
-- ---------------------------------------------------------------------------
drop policy if exists "subscriptions_payer_read" on public.subscriptions;
create policy "subscriptions_payer_read" on public.subscriptions
  for select using (payer_id = (select auth.uid()));

drop policy if exists "subscriptions_payer_insert" on public.subscriptions;
create policy "subscriptions_payer_insert" on public.subscriptions
  for insert with check (
    payer_id = (select auth.uid())
    and studio_id = public.current_studio()
  );

drop policy if exists "subscriptions_payer_update_own" on public.subscriptions;
create policy "subscriptions_payer_update_own" on public.subscriptions
  for update
  using (payer_id = (select auth.uid()))
  with check (payer_id = (select auth.uid()));

drop policy if exists "sub_line_items_payer_read" on public.subscription_line_items;
create policy "sub_line_items_payer_read" on public.subscription_line_items
  for select using (
    exists (
      select 1 from public.subscriptions s
      where s.id = subscription_id
        and s.payer_id = (select auth.uid())
    )
  );

drop policy if exists "invoice_line_items_payer_read" on public.invoice_line_items;
create policy "invoice_line_items_payer_read" on public.invoice_line_items
  for select using (
    exists (
      select 1 from public.invoices i
      where i.id = invoice_id
        and (
          i.payer_id = (select auth.uid())
          or public.is_my_child(i.student_id)
        )
    )
  );

-- ---------------------------------------------------------------------------
-- event_tickets
-- ---------------------------------------------------------------------------
drop policy if exists "event_tickets_own" on public.event_tickets;
create policy "event_tickets_own" on public.event_tickets
  for all
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.events e
      where e.id = event_id
        and e.studio_id = public.current_studio()
    )
  );

-- ---------------------------------------------------------------------------
-- platform support
-- ---------------------------------------------------------------------------
drop policy if exists "admins send support messages" on public.platform_support_messages;
create policy "admins send support messages" on public.platform_support_messages
  for insert to authenticated
  with check (
    sender_profile_id = (select auth.uid())
    and exists (
      select 1 from public.platform_support_threads t
      where t.id = thread_id
        and t.studio_id = public.current_studio()
        and public.current_user_role() = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- studio_invites
-- ---------------------------------------------------------------------------
drop policy if exists "invitee reads own pending invite by token" on public.studio_invites;
create policy "invitee reads own pending invite by token" on public.studio_invites
  for select to authenticated
  using (
    accepted_at is null
    and expires_at > now()
    and lower(email) = lower(coalesce(
      (select email from public.profiles where id = (select auth.uid())),
      (select email from auth.users where id = (select auth.uid()))
    ))
  );

-- ---------------------------------------------------------------------------
-- parent email archive
-- ---------------------------------------------------------------------------
drop policy if exists "parent_email_threads_parent_read" on public.parent_email_threads;
create policy "parent_email_threads_parent_read" on public.parent_email_threads
  for select using (
    studio_id = public.current_studio()
    and parent_id = (select auth.uid())
  );

drop policy if exists "parent_email_threads_parent_update" on public.parent_email_threads;
create policy "parent_email_threads_parent_update" on public.parent_email_threads
  for update using (
    studio_id = public.current_studio()
    and parent_id = (select auth.uid())
  )
  with check (
    studio_id = public.current_studio()
    and parent_id = (select auth.uid())
  );

drop policy if exists "parent_email_messages_parent_read" on public.parent_email_messages;
create policy "parent_email_messages_parent_read" on public.parent_email_messages
  for select using (
    studio_id = public.current_studio()
    and parent_id = (select auth.uid())
  );

-- ---------------------------------------------------------------------------
-- waiver_signatures (SELECT policy from 0044 still used bare auth.uid())
-- ---------------------------------------------------------------------------
drop policy if exists "waiver_sigs_read" on public.waiver_signatures;
create policy "waiver_sigs_read" on public.waiver_signatures
  for select
  using (
    signed_by = (select auth.uid())
    or public.is_my_child(student_id)
    or (
      public.current_user_role() = 'admin'
      and exists (
        select 1
        from public.waivers w
        where w.id = waiver_id
          and w.studio_id = public.current_studio()
      )
    )
  );

drop policy if exists "waiver_sigs_parent_insert" on public.waiver_signatures;
create policy "waiver_sigs_parent_insert" on public.waiver_signatures
  for insert with check (
    signed_by = (select auth.uid())
    and public.is_my_child(student_id)
    and exists (
      select 1 from public.waivers w
      where w.id = waiver_id and w.studio_id = public.current_studio()
    )
  );

-- ---------------------------------------------------------------------------
-- staff management (0045) — fix before first deploy
-- ---------------------------------------------------------------------------
drop policy if exists "staff_members_self_read" on public.staff_members;
create policy "staff_members_self_read" on public.staff_members
  for select using (
    studio_id = public.current_studio()
    and profile_id = (select auth.uid())
    and public.current_user_role() in ('office', 'teacher')
  );

drop policy if exists "staff_shifts_self_read" on public.staff_shifts;
create policy "staff_shifts_self_read" on public.staff_shifts
  for select using (
    studio_id = public.current_studio()
    and staff_id = (select auth.uid())
    and public.current_user_role() in ('office', 'teacher')
  );
