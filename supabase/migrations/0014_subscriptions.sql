-- ============================================================================
--  0014_subscriptions.sql   (Phase 3.2)
--  Auto-pay subscriptions: recurring Stripe charges for an enrolled class.
--
--  A subscription row mirrors a Stripe Subscription. The createSubscription
--  server action creates the Stripe Subscription (monthly, default_incomplete)
--  and the customer.subscription.* webhooks keep this table in sync.
--
--  Apply after 0005_stripe_fields.sql.
-- ============================================================================

create table if not exists public.subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  studio_id              uuid not null references public.studios(id)  on delete cascade,
  payer_id               uuid not null references public.profiles(id) on delete cascade,  -- parent
  student_id             uuid references public.profiles(id)          on delete set null, -- dancer
  class_id               uuid references public.classes(id)           on delete set null,
  stripe_subscription_id text unique,
  stripe_customer_id     text,
  plan_label             text,
  amount_cents           int  not null default 0,
  currency               text not null default 'aud',
  interval               text not null default 'month',     -- month | year
  status                 text not null default 'incomplete', -- incomplete|active|past_due|canceled|unpaid
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  created_at             timestamptz not null default now()
);

create index if not exists subscriptions_studio_idx  on public.subscriptions(studio_id);
create index if not exists subscriptions_payer_idx   on public.subscriptions(payer_id);
create index if not exists subscriptions_stripe_idx  on public.subscriptions(stripe_subscription_id);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table public.subscriptions enable row level security;

grant select, insert, update on public.subscriptions to authenticated;

drop policy if exists "subscriptions_admin_all" on public.subscriptions;
create policy "subscriptions_admin_all" on public.subscriptions
  for all using (
    studio_id = public.current_studio()
    and public.current_user_role() = 'admin'
  )
  with check (
    studio_id = public.current_studio()
    and public.current_user_role() = 'admin'
  );

drop policy if exists "subscriptions_payer_read" on public.subscriptions;
create policy "subscriptions_payer_read" on public.subscriptions
  for select using (payer_id = auth.uid());

drop policy if exists "subscriptions_payer_insert" on public.subscriptions;
create policy "subscriptions_payer_insert" on public.subscriptions
  for insert with check (payer_id = auth.uid());
