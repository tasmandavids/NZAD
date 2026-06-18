-- ============================================================================
--  0025_site_extensions.sql
--  Base44-style site builder extensions: staff, class streams/rooms, event
--  categories, site chrome settings, and public-read policies for anon visitors.
-- ============================================================================

-- Site chrome settings (footer, locations, portal label) on branding row.
alter table public.studio_branding
  add column if not exists site_settings jsonb not null default '{}'::jsonb;

-- Class stream (age band) and room/studio for schedule filtering.
alter table public.classes
  add column if not exists stream text,
  add column if not exists room text;

create index if not exists classes_stream_idx on public.classes(studio_id, stream);
create index if not exists classes_schedule_idx on public.classes(studio_id, day_of_week, start_time);

-- Event category for news feed filters (news, events, term_dates, productions, announcements).
alter table public.events
  add column if not exists category text not null default 'events';

-- Staff / instructors for the people grid block.
create table if not exists public.staff (
  id          uuid primary key default gen_random_uuid(),
  studio_id   uuid not null references public.studios(id) on delete cascade,
  name        text not null,
  role        text,
  bio         text,
  photo_url   text,
  sort_order  int not null default 0,
  published   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists staff_studio_idx on public.staff(studio_id, sort_order);

drop trigger if exists staff_touch_updated_at on public.staff;
create trigger staff_touch_updated_at
  before update on public.staff
  for each row execute function public.touch_updated_at();

-- ─── RLS: staff ──────────────────────────────────────────────────────────────

alter table public.staff enable row level security;

drop policy if exists "staff_admin_all" on public.staff;
create policy "staff_admin_all" on public.staff
  for all using (
    studio_id = public.current_studio()
    and public.current_user_role() = 'admin'
  )
  with check (
    studio_id = public.current_studio()
    and public.current_user_role() = 'admin'
  );

drop policy if exists "staff_public_read" on public.staff;
create policy "staff_public_read" on public.staff
  for select using (
    published = true
    and exists (
      select 1 from public.studios s
      where s.id = studio_id and s.status <> 'suspended'
    )
  );

grant select on public.staff to anon, authenticated;
grant insert, update, delete on public.staff to authenticated;

-- ─── Public catalog reads for anonymous website visitors ─────────────────────
--  The public site queries by studio_id; these policies allow anon reads for
--  non-suspended studios (marketing catalog data only).

drop policy if exists "classes_public_catalog" on public.classes;
create policy "classes_public_catalog" on public.classes
  for select using (
    exists (
      select 1 from public.studios s
      where s.id = studio_id and s.status <> 'suspended'
    )
  );

drop policy if exists "events_public_anon_read" on public.events;
create policy "events_public_anon_read" on public.events
  for select using (
    status = 'published'
    and exists (
      select 1 from public.studios s
      where s.id = studio_id and s.status <> 'suspended'
    )
  );

drop policy if exists "products_public_catalog" on public.products;
create policy "products_public_catalog" on public.products
  for select using (
    active = true
    and exists (
      select 1 from public.studios s
      where s.id = studio_id and s.status <> 'suspended'
    )
  );

grant select on public.classes  to anon;
grant select on public.events   to anon;
grant select on public.products to anon;
