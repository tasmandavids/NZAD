-- Term payment plans: split aggregated account balance into 3 monthly installments.

create table if not exists public.term_payment_plans (
  id                  uuid primary key default gen_random_uuid(),
  studio_id           uuid not null references public.studios(id) on delete cascade,
  payer_id            uuid not null references public.profiles(id) on delete restrict,
  total_cents         int not null check (total_cents > 0),
  installment_count   int not null default 3 check (installment_count > 0),
  installment_amounts int[] not null,
  installments_paid   int not null default 0 check (installments_paid >= 0),
  amount_paid_cents   int not null default 0 check (amount_paid_cents >= 0),
  next_due_date       date,
  status              text not null default 'active'
    check (status in ('active', 'completed', 'cancelled')),
  created_at          timestamptz not null default now(),
  completed_at        timestamptz
);

create index if not exists term_payment_plans_studio_payer_idx
  on public.term_payment_plans (studio_id, payer_id, status);

create table if not exists public.term_payment_plan_invoices (
  plan_id    uuid not null references public.term_payment_plans(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  primary key (plan_id, invoice_id)
);

create index if not exists term_payment_plan_invoices_invoice_idx
  on public.term_payment_plan_invoices (invoice_id);

alter table public.invoices
  add column if not exists term_payment_plan_id uuid
    references public.term_payment_plans(id) on delete set null;

create index if not exists invoices_term_plan_idx
  on public.invoices (term_payment_plan_id)
  where term_payment_plan_id is not null;

alter table public.payments
  add column if not exists term_payment_plan_id uuid
    references public.term_payment_plans(id) on delete set null;

alter table public.term_payment_plans enable row level security;
alter table public.term_payment_plan_invoices enable row level security;

grant select, insert, update on public.term_payment_plans to authenticated;
grant select, insert on public.term_payment_plan_invoices to authenticated;

drop policy if exists "term_plans_admin_all" on public.term_payment_plans;
create policy "term_plans_admin_all" on public.term_payment_plans
  for all using (
    studio_id = private.current_studio()
    and private.current_user_role() = 'admin'
  )
  with check (
    studio_id = private.current_studio()
    and private.current_user_role() = 'admin'
  );

drop policy if exists "term_plans_payer_read" on public.term_payment_plans;
create policy "term_plans_payer_read" on public.term_payment_plans
  for select using (payer_id = auth.uid());

drop policy if exists "term_plans_payer_insert" on public.term_payment_plans;
create policy "term_plans_payer_insert" on public.term_payment_plans
  for insert with check (payer_id = auth.uid());

drop policy if exists "term_plans_payer_update_own" on public.term_payment_plans;
create policy "term_plans_payer_update_own" on public.term_payment_plans
  for update using (payer_id = auth.uid());

drop policy if exists "term_plan_invoices_admin" on public.term_payment_plan_invoices;
create policy "term_plan_invoices_admin" on public.term_payment_plan_invoices
  for all using (
    exists (
      select 1 from public.term_payment_plans p
      where p.id = plan_id
        and p.studio_id = private.current_studio()
        and private.current_user_role() = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.term_payment_plans p
      where p.id = plan_id
        and p.studio_id = private.current_studio()
        and private.current_user_role() = 'admin'
    )
  );

drop policy if exists "term_plan_invoices_payer_read" on public.term_payment_plan_invoices;
create policy "term_plan_invoices_payer_read" on public.term_payment_plan_invoices
  for select using (
    exists (
      select 1 from public.term_payment_plans p
      where p.id = plan_id and p.payer_id = auth.uid()
    )
  );

drop policy if exists "term_plan_invoices_payer_insert" on public.term_payment_plan_invoices;
create policy "term_plan_invoices_payer_insert" on public.term_payment_plan_invoices
  for insert with check (
    exists (
      select 1 from public.term_payment_plans p
      where p.id = plan_id and p.payer_id = auth.uid()
    )
  );
