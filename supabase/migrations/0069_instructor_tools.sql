-- ============================================================================
--  0069_instructor_tools.sql
--  Sole-trader tools: private client roster + contractor invoicing
-- ============================================================================

-- Private clients (1:1 clients not in any studio system)
create table if not exists public.private_clients (
  id             uuid primary key default gen_random_uuid(),
  instructor_id  uuid not null references public.profiles(id) on delete cascade,
  full_name      text not null,
  email          text,
  phone          text,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists private_clients_instructor_idx on public.private_clients(instructor_id);

alter table public.private_clients enable row level security;

drop policy if exists "private_clients_own" on public.private_clients;
create policy "private_clients_own" on public.private_clients
  for all using (instructor_id = auth.uid());

-- Contractor invoices (sent to studios or private clients)
create table if not exists public.contractor_invoices (
  id                  uuid primary key default gen_random_uuid(),
  instructor_id       uuid not null references public.profiles(id) on delete cascade,
  -- recipient: one of these two is set
  studio_id           uuid references public.studios(id) on delete set null,
  private_client_id   uuid references public.private_clients(id) on delete set null,
  recipient_label     text not null, -- denormalised name for display
  description         text not null,
  line_items          jsonb not null default '[]',
  amount_cents        int not null check (amount_cents >= 0),
  currency            text not null default 'nzd',
  status              text not null default 'draft'
                        check (status in ('draft','sent','paid','void')),
  invoice_number      int,
  due_date            date,
  paid_at             timestamptz,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint one_recipient check (
    (studio_id is not null)::int + (private_client_id is not null)::int <= 1
  )
);

create index if not exists contractor_invoices_instructor_idx on public.contractor_invoices(instructor_id);
create index if not exists contractor_invoices_status_idx on public.contractor_invoices(instructor_id, status);

-- Auto-increment invoice number per instructor
create sequence if not exists contractor_invoice_number_seq start 1;

create or replace function public.assign_contractor_invoice_number()
returns trigger language plpgsql as $$
begin
  if new.invoice_number is null then
    new.invoice_number := (
      select coalesce(max(invoice_number), 0) + 1
      from public.contractor_invoices
      where instructor_id = new.instructor_id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists set_contractor_invoice_number on public.contractor_invoices;
create trigger set_contractor_invoice_number
  before insert on public.contractor_invoices
  for each row execute function public.assign_contractor_invoice_number();

alter table public.contractor_invoices enable row level security;

drop policy if exists "contractor_invoices_own" on public.contractor_invoices;
create policy "contractor_invoices_own" on public.contractor_invoices
  for all using (instructor_id = auth.uid());

grant select, insert, update, delete on public.private_clients to authenticated;
grant select, insert, update, delete on public.contractor_invoices to authenticated;
