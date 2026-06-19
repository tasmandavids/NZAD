-- ============================================================================
--  0036_xero_integration.sql
--  Xero OAuth connection, sync log, and cross-reference columns.
-- ============================================================================

do $$ begin
  create type public.xero_sync_source as enum ('invoice', 'order', 'ticket');
exception when duplicate_object then null;
end $$;

create table if not exists public.xero_connections (
  id                    uuid primary key default gen_random_uuid(),
  studio_id             uuid not null references public.studios(id) on delete cascade,
  tenant_id             text not null,
  tenant_name           text not null,
  org_short_code        text,
  credentials_encrypted text not null,
  connected_by          uuid references public.profiles(id) on delete set null,
  last_sync_at          timestamptz,
  sync_error            text,
  settings              jsonb not null default '{"sync_enabled": true, "sales_account_code": "200"}'::jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (studio_id)
);

create index if not exists xero_connections_studio_idx on public.xero_connections(studio_id);

create table if not exists public.xero_sync_log (
  id              uuid primary key default gen_random_uuid(),
  studio_id       uuid not null references public.studios(id) on delete cascade,
  source_type     public.xero_sync_source not null,
  source_id       uuid not null,
  xero_invoice_id text,
  status          text not null default 'pending',
  error           text,
  created_at      timestamptz not null default now(),
  unique (source_type, source_id)
);

create index if not exists xero_sync_log_studio_idx on public.xero_sync_log(studio_id, created_at desc);

-- Cross-reference columns on sale records
alter table public.invoices add column if not exists xero_invoice_id text;
alter table public.orders add column if not exists xero_invoice_id text;
alter table public.event_tickets add column if not exists xero_invoice_id text;
alter table public.profiles add column if not exists xero_contact_id text;

create index if not exists invoices_xero_idx on public.invoices(xero_invoice_id) where xero_invoice_id is not null;
create index if not exists orders_xero_idx on public.orders(xero_invoice_id) where xero_invoice_id is not null;
create index if not exists event_tickets_xero_idx on public.event_tickets(xero_invoice_id) where xero_invoice_id is not null;

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table public.xero_connections enable row level security;
alter table public.xero_sync_log enable row level security;

drop policy if exists "xero_connections_admin" on public.xero_connections;
create policy "xero_connections_admin" on public.xero_connections
  for all using (
    studio_id = public.current_studio()
    and public.current_user_role() = 'admin'
  );

drop policy if exists "xero_sync_log_admin" on public.xero_sync_log;
create policy "xero_sync_log_admin" on public.xero_sync_log
  for select using (
    studio_id = public.current_studio()
    and public.current_user_role() = 'admin'
  );

-- Service role writes sync log from webhooks (bypasses RLS via service key)
grant select, insert, update, delete on public.xero_connections to authenticated;
grant select on public.xero_sync_log to authenticated;
