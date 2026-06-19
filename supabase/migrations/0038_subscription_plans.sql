-- Admin subscription plans: line items, billing interval, monthly invoice generation.

alter table public.subscriptions
  add column if not exists billing_interval text not null default 'month',
  add column if not exists monthly_amount_cents int not null default 0,
  add column if not exists discount_cents int not null default 0,
  add column if not exists admin_created boolean not null default false,
  add column if not exists last_invoiced_month text;

alter table public.invoices
  add column if not exists subscription_id uuid references public.subscriptions(id) on delete set null;

create index if not exists invoices_subscription_idx on public.invoices(subscription_id);

create table if not exists public.subscription_line_items (
  id                  uuid primary key default gen_random_uuid(),
  subscription_id     uuid not null references public.subscriptions(id) on delete cascade,
  item_type           text not null,
  reference_id        uuid,
  description         text not null,
  quantity            int not null default 1 check (quantity > 0),
  unit_monthly_cents  int not null,
  line_total_cents    int not null,
  sort_order          int not null default 0,
  created_at          timestamptz not null default now()
);

create index if not exists subscription_line_items_sub_idx
  on public.subscription_line_items(subscription_id, sort_order);

create table if not exists public.invoice_line_items (
  id               uuid primary key default gen_random_uuid(),
  invoice_id       uuid not null references public.invoices(id) on delete cascade,
  item_type        text,
  reference_id     uuid,
  description      text not null,
  quantity         int not null default 1,
  unit_cents       int not null,
  line_total_cents int not null,
  sort_order       int not null default 0
);

create index if not exists invoice_line_items_invoice_idx
  on public.invoice_line_items(invoice_id, sort_order);

alter table public.subscription_line_items enable row level security;
alter table public.invoice_line_items enable row level security;

grant select, insert, update, delete on public.subscription_line_items to authenticated;
grant select, insert on public.invoice_line_items to authenticated;

drop policy if exists "sub_line_items_admin" on public.subscription_line_items;
create policy "sub_line_items_admin" on public.subscription_line_items
  for all using (
    exists (
      select 1 from public.subscriptions s
      where s.id = subscription_id
        and s.studio_id = public.current_studio()
        and public.current_user_role() = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.subscriptions s
      where s.id = subscription_id
        and s.studio_id = public.current_studio()
        and public.current_user_role() = 'admin'
    )
  );

drop policy if exists "sub_line_items_payer_read" on public.subscription_line_items;
create policy "sub_line_items_payer_read" on public.subscription_line_items
  for select using (
    exists (
      select 1 from public.subscriptions s
      where s.id = subscription_id and s.payer_id = auth.uid()
    )
  );

drop policy if exists "invoice_line_items_admin" on public.invoice_line_items;
create policy "invoice_line_items_admin" on public.invoice_line_items
  for all using (
    exists (
      select 1 from public.invoices i
      where i.id = invoice_id
        and i.studio_id = public.current_studio()
        and public.current_user_role() = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.invoices i
      where i.id = invoice_id
        and i.studio_id = public.current_studio()
        and public.current_user_role() = 'admin'
    )
  );

drop policy if exists "invoice_line_items_payer_read" on public.invoice_line_items;
create policy "invoice_line_items_payer_read" on public.invoice_line_items
  for select using (
    exists (
      select 1 from public.invoices i
      where i.id = invoice_id
        and (i.payer_id = auth.uid() or public.is_my_child(i.student_id))
    )
  );
