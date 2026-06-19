-- Fix email inbox RLS: explicit WITH CHECK for inserts/updates.

drop policy if exists "email_accounts_admin" on public.email_accounts;
create policy "email_accounts_admin" on public.email_accounts
  for all
  using (studio_id = public.current_studio() and public.current_user_role() = 'admin')
  with check (studio_id = public.current_studio() and public.current_user_role() = 'admin');

drop policy if exists "email_threads_admin" on public.email_threads;
create policy "email_threads_admin" on public.email_threads
  for all
  using (studio_id = public.current_studio() and public.current_user_role() = 'admin')
  with check (studio_id = public.current_studio() and public.current_user_role() = 'admin');

drop policy if exists "email_messages_admin" on public.email_messages;
create policy "email_messages_admin" on public.email_messages
  for all
  using (studio_id = public.current_studio() and public.current_user_role() = 'admin')
  with check (studio_id = public.current_studio() and public.current_user_role() = 'admin');
