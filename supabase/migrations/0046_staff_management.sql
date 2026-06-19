-- ============================================================================
--  0046 — Staff management: HR records, shift calendar
-- ============================================================================

-- Employment / workplace enums
do $$ begin
  create type public.staff_employment_type as enum (
    'full_time', 'part_time', 'casual', 'contractor'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.staff_work_location as enum (
    'on_site', 'remote', 'hybrid'
  );
exception when duplicate_object then null;
end $$;

-- Helper for future RLS (admin + office front-desk)
create or replace function public.is_studio_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_user_role() in ('admin', 'office');
$$;

-- HR record per portal staff member (teacher / office)
create table if not exists public.staff_members (
  profile_id      uuid primary key references public.profiles(id) on delete cascade,
  studio_id       uuid not null references public.studios(id) on delete cascade,
  employment_type public.staff_employment_type,
  work_location   public.staff_work_location,
  location_names  text[] not null default '{}',
  schedule_notes  text,
  contract_notes  text,
  pay_notes       text,
  manager_id      uuid references public.profiles(id) on delete set null,
  start_date      date,
  end_date        date,
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists staff_members_studio_idx on public.staff_members (studio_id);
create index if not exists staff_members_manager_idx on public.staff_members (manager_id);

-- Shift blocks for staff calendar
create table if not exists public.staff_shifts (
  id            uuid primary key default gen_random_uuid(),
  studio_id     uuid not null references public.studios(id) on delete cascade,
  staff_id      uuid not null references public.profiles(id) on delete cascade,
  shift_date    date not null,
  start_time    time not null,
  end_time      time not null,
  location_name text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint staff_shifts_time_order check (end_time > start_time)
);

create index if not exists staff_shifts_studio_date_idx
  on public.staff_shifts (studio_id, shift_date);
create index if not exists staff_shifts_staff_date_idx
  on public.staff_shifts (staff_id, shift_date);

-- updated_at triggers
drop trigger if exists staff_members_updated_at on public.staff_members;
create trigger staff_members_updated_at
  before update on public.staff_members
  for each row execute function public.touch_updated_at();

drop trigger if exists staff_shifts_updated_at on public.staff_shifts;
create trigger staff_shifts_updated_at
  before update on public.staff_shifts
  for each row execute function public.touch_updated_at();

-- RLS
alter table public.staff_members enable row level security;
alter table public.staff_shifts enable row level security;

drop policy if exists "staff_members_admin_all" on public.staff_members;
create policy "staff_members_admin_all" on public.staff_members
  for all using (
    studio_id = public.current_studio()
    and public.current_user_role() = 'admin'
  )
  with check (
    studio_id = public.current_studio()
    and public.current_user_role() = 'admin'
  );

drop policy if exists "staff_members_self_read" on public.staff_members;
create policy "staff_members_self_read" on public.staff_members
  for select using (
    studio_id = public.current_studio()
    and profile_id = auth.uid()
    and public.current_user_role() in ('office', 'teacher')
  );

drop policy if exists "staff_shifts_admin_all" on public.staff_shifts;
create policy "staff_shifts_admin_all" on public.staff_shifts
  for all using (
    studio_id = public.current_studio()
    and public.current_user_role() = 'admin'
  )
  with check (
    studio_id = public.current_studio()
    and public.current_user_role() = 'admin'
  );

drop policy if exists "staff_shifts_self_read" on public.staff_shifts;
create policy "staff_shifts_self_read" on public.staff_shifts
  for select using (
    studio_id = public.current_studio()
    and staff_id = auth.uid()
    and public.current_user_role() in ('office', 'teacher')
  );

-- Backfill existing teachers
insert into public.staff_members (profile_id, studio_id, active)
select p.id, p.studio_id, true
from public.profiles p
where p.role = 'teacher'
  and p.studio_id is not null
on conflict (profile_id) do nothing;
