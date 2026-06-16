-- ============================================================================
--  0005_stripe_fields.sql
--  Adds Stripe-specific columns to invoices + profiles tables.
--  Also adds a payments table for individual payment intent records.
-- ============================================================================

-- ─── Stripe columns on invoices ──────────────────────────────────────────────
alter table public.invoices
  add column if not exists stripe_payment_intent_id text,
  add column if not exists stripe_invoice_id         text,
  add column if not exists paid_at                   timestamptz;

-- ─── Stripe customer ID on profiles ─────────────────────────────────────────
alter table public.profiles
  add column if not exists stripe_customer_id text;

-- ─── Payments table (individual charge records) ──────────────────────────────
create table if not exists public.payments (
  id                      uuid primary key default gen_random_uuid(),
  studio_id               uuid not null references public.studios(id) on delete cascade,
  payer_id                uuid references public.profiles(id) on delete set null,
  invoice_id              uuid references public.invoices(id) on delete set null,
  amount_cents            int  not null,
  currency                text not null default 'nzd',
  stripe_payment_intent_id text,
  status                  text not null default 'pending',   -- pending | succeeded | failed | refunded
  description             text,
  created_at              timestamptz not null default now()
);

create index if not exists payments_studio_idx  on public.payments(studio_id);
create index if not exists payments_payer_idx   on public.payments(payer_id);
create index if not exists payments_invoice_idx on public.payments(invoice_id);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table public.payments enable row level security;

drop policy if exists "payments_admin_all" on public.payments;
create policy "payments_admin_all" on public.payments
  for all using (
    studio_id = public.current_studio()
    and public.current_user_role() = 'admin'
  );

drop policy if exists "payments_payer_read" on public.payments;
create policy "payments_payer_read" on public.payments
  for select using (payer_id = auth.uid());

grant select, insert, update on public.payments to authenticated;
