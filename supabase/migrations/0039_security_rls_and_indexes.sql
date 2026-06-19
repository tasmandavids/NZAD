-- Tighten RLS gaps and add composite indexes for hot billing/admin filters.

-- event_tickets: payer can only reserve tickets for events in their studio.
drop policy if exists "event_tickets_own" on public.event_tickets;
create policy "event_tickets_own" on public.event_tickets
  for all
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.events e
      where e.id = event_id
        and e.studio_id = public.current_studio()
    )
  );

-- subscriptions: parent inserts must target their own studio.
drop policy if exists "subscriptions_payer_insert" on public.subscriptions;
create policy "subscriptions_payer_insert" on public.subscriptions
  for insert with check (
    payer_id = auth.uid()
    and studio_id = public.current_studio()
  );

create index if not exists invoices_studio_status_idx
  on public.invoices (studio_id, status);

create index if not exists invoices_studio_paid_at_idx
  on public.invoices (studio_id, paid_at desc)
  where status = 'paid';

create index if not exists profiles_studio_role_idx
  on public.profiles (studio_id, role);
