-- ============================================================================
--  0070_availability_and_substitutes.sql
--  Instructor availability windows + substitute board
-- ============================================================================

-- Weekly recurring availability slots (day + time range)
create table if not exists public.instructor_availability (
  id             uuid primary key default gen_random_uuid(),
  instructor_id  uuid not null references public.profiles(id) on delete cascade,
  day_of_week    int not null check (day_of_week between 0 and 6), -- 0=Sun
  start_time     time not null,
  end_time       time not null,
  notes          text,
  created_at     timestamptz not null default now(),
  constraint availability_time_order check (end_time > start_time)
);

create index if not exists availability_instructor_idx
  on public.instructor_availability(instructor_id, day_of_week);

alter table public.instructor_availability enable row level security;

drop policy if exists "availability_own" on public.instructor_availability;
create policy "availability_own" on public.instructor_availability
  for all using (instructor_id = auth.uid());

-- Admins in any studio can read availability of teachers they employ
drop policy if exists "availability_admin_read" on public.instructor_availability;
create policy "availability_admin_read" on public.instructor_availability
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and p.studio_id in (
          select studio_id from public.studio_memberships
          where user_id = instructor_availability.instructor_id
        )
    )
  );

-- Substitute requests: a studio posts a class that needs covering
create table if not exists public.substitute_requests (
  id             uuid primary key default gen_random_uuid(),
  studio_id      uuid not null references public.studios(id) on delete cascade,
  class_id       uuid references public.classes(id) on delete set null,
  posted_by      uuid not null references public.profiles(id) on delete cascade,
  class_name     text not null,    -- denormalised in case class is deleted
  discipline     text,
  date           date not null,
  start_time     time not null,
  end_time       time not null,
  notes          text,
  status         text not null default 'open'
                   check (status in ('open', 'filled', 'cancelled')),
  filled_by      uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists sub_requests_studio_idx on public.substitute_requests(studio_id, date);
create index if not exists sub_requests_status_idx on public.substitute_requests(status, date);

alter table public.substitute_requests enable row level security;

-- Admins manage their studio's requests
drop policy if exists "sub_requests_admin" on public.substitute_requests;
create policy "sub_requests_admin" on public.substitute_requests
  for all using (
    studio_id = private.current_studio()
    and private.current_user_role() = 'admin'
  );

-- Teachers/instructors can read open requests across studios they belong to
drop policy if exists "sub_requests_teacher_read" on public.substitute_requests;
create policy "sub_requests_teacher_read" on public.substitute_requests
  for select using (
    status = 'open'
    and (
      -- teacher at this studio
      studio_id = private.current_studio()
      or
      -- instructor affiliated with this studio
      exists (
        select 1 from public.studio_memberships sm
        where sm.user_id = auth.uid()
          and sm.studio_id = substitute_requests.studio_id
          and sm.status = 'active'
      )
    )
  );

-- Teachers can claim (update filled_by + status) on open requests
drop policy if exists "sub_requests_teacher_claim" on public.substitute_requests;
create policy "sub_requests_teacher_claim" on public.substitute_requests
  for update using (status = 'open')
  with check (
    filled_by = auth.uid()
    and status = 'filled'
  );

grant select, insert, update, delete on public.instructor_availability to authenticated;
grant select, insert, update, delete on public.substitute_requests to authenticated;
