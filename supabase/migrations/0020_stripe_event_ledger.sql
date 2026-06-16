-- ============================================================================
--  0020 — Stripe webhook idempotency ledger   (Session 9 · Priority 4)
--
--  Stripe delivers webhooks at-least-once and retries on non-2xx, so the same
--  event.id can arrive multiple times. Several handlers are idempotent by
--  row-state checks, but a central processed-events ledger lets the handler
--  short-circuit replays before doing any work.
--
--  Written/read only by the webhook handler via the service-role client, so RLS
--  is enabled with no public policies (deny-all to normal users).
-- ============================================================================

create table if not exists public.stripe_events (
  id            text primary key,                 -- Stripe event.id (evt_...)
  type          text not null,
  received_at   timestamptz not null default now()
);

alter table public.stripe_events enable row level security;
-- No policies → only the service-role key (which bypasses RLS) can touch it.
