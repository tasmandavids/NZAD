-- ============================================================================
--  0006_leads.sql
--  CRM leads pipeline for prospective students / parents.
-- ============================================================================

create table if not exists public.leads (
  id          uuid primary key default gen_random_uuid(),
  studio_id   uuid not null references public.studios(id) on delete cascade,
  first_name  text not null,
  last_name   text,
  email       text,
  phone       text,
  source      text,              -- e.g. "website", "referral", "social", "walk-in"
  status      text not null default 'new'
                check (status in ('new', 'contacted', 'trial', 'converted', 'lost')),
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists leads_studio_idx  on public.leads(studio_id);
create index if not exists leads_status_idx  on public.leads(studio_id, status);

-- Auto-update updated_at
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists leads_touch_updated_at on public.leads;
create trigger leads_touch_updated_at
  before update on public.leads
  for each row execute function public.touch_updated_at();

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table public.leads enable row level security;

drop policy if exists "leads_admin_all" on public.leads;
create policy "leads_admin_all" on public.leads
  for all using (
    studio_id = public.current_studio()
    and public.current_user_role() = 'admin'
  );

drop policy if exists "leads_staff_read" on public.leads;
create policy "leads_staff_read" on public.leads
  for select using (
    studio_id = public.current_studio()
    and public.current_user_role() in ('admin', 'staff')
  );

grant select, insert, update, delete on public.leads to authenticated;
