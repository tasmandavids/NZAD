-- Parent self-service, messages, orders, and waiver RLS hardening.

-- Parent enrollment insert (free / waitlist path).
drop policy if exists "enroll_parent_insert_child" on public.enrollments;
create policy "enroll_parent_insert_child" on public.enrollments
  for insert with check (
    studio_id = public.current_studio()
    and public.current_user_role() = 'parent'
    and public.is_my_child(student_id)
    and exists (
      select 1 from public.classes c
      where c.id = class_id and c.studio_id = public.current_studio()
    )
  );

-- Parent invoice create for enrollment payments.
drop policy if exists "inv_parent_insert_own" on public.invoices;
create policy "inv_parent_insert_own" on public.invoices
  for insert with check (
    studio_id = public.current_studio()
    and payer_id = auth.uid()
    and public.is_my_child(student_id)
  );

drop policy if exists "inv_parent_update_own_sent" on public.invoices;
create policy "inv_parent_update_own_sent" on public.invoices
  for update
  using (payer_id = auth.uid() and status in ('draft', 'sent'))
  with check (payer_id = auth.uid());

-- Parent subscription cancel at period end.
drop policy if exists "subscriptions_payer_update_own" on public.subscriptions;
create policy "subscriptions_payer_update_own" on public.subscriptions
  for update
  using (payer_id = auth.uid())
  with check (payer_id = auth.uid());

-- Messages: recipient must belong to sender's studio.
drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages
  for insert with check (
    studio_id = public.current_studio()
    and from_user_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = to_user_id and p.studio_id = public.current_studio()
    )
  );

-- Orders: must target the buyer's studio.
drop policy if exists "orders_own" on public.orders;
create policy "orders_own" on public.orders
  for all
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and studio_id = public.current_studio()
  );

-- Waiver signatures: waiver must belong to the signer's studio.
drop policy if exists "waiver_sigs_parent_insert" on public.waiver_signatures;
create policy "waiver_sigs_parent_insert" on public.waiver_signatures
  for insert with check (
    signed_by = auth.uid()
    and public.is_my_child(student_id)
    and exists (
      select 1 from public.waivers w
      where w.id = waiver_id and w.studio_id = public.current_studio()
    )
  );
