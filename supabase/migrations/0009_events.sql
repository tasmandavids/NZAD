-- ============================================================================
--  0009_events.sql
--  Events (recitals, showcases, workshops) + ticket purchasing.
-- ============================================================================

create table if not exists public.events (
  id              uuid primary key default gen_random_uuid(),
  studio_id       uuid not null references public.studios(id) on delete cascade,
  name            text not null,
  description     text,
  event_date      timestamptz not null,
  venue_name      text,
  venue_address   text,
  ticket_price    integer not null default 0,  -- cents (0 = free)
  total_tickets   integer not null default 100,
  sold_tickets    integer not null default 0,
  status          text not null default 'draft'
                    check (status in ('draft', 'published', 'cancelled', 'completed')),
  image_url       text,
  created_by      uuid references public.profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists events_studio_idx  on public.events(studio_id, event_date desc);
create index if not exists events_status_idx  on public.events(studio_id, status);

-- Trigger: touch updated_at
drop trigger if exists events_touch_updated_at on public.events;
create trigger events_touch_updated_at
  before update on public.events
  for each row execute function public.touch_updated_at();

create table if not exists public.event_tickets (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references public.events(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  quantity      integer not null default 1 check (quantity > 0),
  total_cents   integer not null default 0,
  qr_code       text,              -- base64 or URL of the generated QR
  stripe_payment_intent_id text,
  status        text not null default 'reserved'
                  check (status in ('reserved', 'paid', 'cancelled', 'refunded')),
  purchased_at  timestamptz not null default now(),
  unique (event_id, user_id)
);

create index if not exists event_tickets_event_idx on public.event_tickets(event_id);
create index if not exists event_tickets_user_idx  on public.event_tickets(user_id);

-- Trigger: auto-increment sold_tickets on ticket insert/update
create or replace function public.sync_event_sold_tickets()
returns trigger language plpgsql security definer as $$
begin
  update public.events
  set sold_tickets = (
    select coalesce(sum(quantity), 0)
    from public.event_tickets
    where event_id = coalesce(new.event_id, old.event_id)
      and status in ('reserved', 'paid')
  )
  where id = coalesce(new.event_id, old.event_id);
  return coalesce(new, old);
end;
$$;

drop trigger if exists event_tickets_sync on public.event_tickets;
create trigger event_tickets_sync
  after insert or update of status, quantity or delete on public.event_tickets
  for each row execute function public.sync_event_sold_tickets();

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table public.events enable row level security;

drop policy if exists "events_admin_all" on public.events;
create policy "events_admin_all" on public.events
  for all using (
    studio_id = public.current_studio()
    and public.current_user_role() = 'admin'
  );

drop policy if exists "events_public_read" on public.events;
create policy "events_public_read" on public.events
  for select using (
    studio_id = public.current_studio()
    and status = 'published'
  );

alter table public.event_tickets enable row level security;

drop policy if exists "event_tickets_own" on public.event_tickets;
create policy "event_tickets_own" on public.event_tickets
  for all using (user_id = auth.uid());

drop policy if exists "event_tickets_admin_all" on public.event_tickets;
create policy "event_tickets_admin_all" on public.event_tickets
  for all using (
    exists (
      select 1 from public.events e
      where e.id = event_id
        and e.studio_id = public.current_studio()
        and public.current_user_role() = 'admin'
    )
  );

grant select, insert, update on public.events        to authenticated;
grant select, insert, update on public.event_tickets to authenticated;
