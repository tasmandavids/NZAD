-- ============================================================================
--  0077_network_directory.sql
--  Olune Network: extended instructor profile fields + inquiry threads
-- ============================================================================

-- Extended profile fields for Network directory
alter table public.profiles
  add column if not exists syllabus_certs     text[],   -- RAD, ISTD, CSTD, etc.
  add column if not exists training_institutions text[], -- Vaganova Academy, NZSD, etc.
  add column if not exists age_groups          text[],   -- Early childhood, Primary, etc.
  add column if not exists engagement_types    text[],   -- One-off cover, Workshop, etc.
  add column if not exists availability_type   text[],   -- Local cover, Regional, International travel
  add column if not exists teaching_video_url  text,     -- YouTube/Vimeo embed
  add column if not exists rate_min_nzd        int,      -- per day, NZD equivalent
  add column if not exists rate_max_nzd        int,
  add column if not exists network_verified    boolean not null default false;

-- Constraint: rate range order
alter table public.profiles
  drop constraint if exists rate_range_order;
alter table public.profiles
  add constraint rate_range_order check (
    rate_min_nzd is null or rate_max_nzd is null or rate_max_nzd >= rate_min_nzd
  );

-- ============================================================================
--  Inquiry threads: studio → instructor
-- ============================================================================

create table if not exists public.network_inquiries (
  id                uuid primary key default gen_random_uuid(),
  instructor_id     uuid not null references public.profiles(id) on delete cascade,
  studio_id         uuid not null references public.studios(id) on delete cascade,
  -- context
  sender_id         uuid not null references public.profiles(id) on delete cascade,
  subject           text not null,
  engagement_type   text,           -- One-off cover, Workshop, etc.
  proposed_dates    text,           -- free text: "15–19 July 2026"
  location          text,           -- where the engagement would be
  proposed_rate_nzd int,            -- per day NZD
  message           text not null,  -- opening message
  -- state
  status            text not null default 'sent'
                      check (status in ('sent', 'viewed', 'replied', 'declined', 'accepted', 'withdrawn')),
  instructor_viewed_at timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists network_inquiries_instructor_idx on public.network_inquiries(instructor_id, status);
create index if not exists network_inquiries_studio_idx    on public.network_inquiries(studio_id, created_at desc);

alter table public.network_inquiries enable row level security;

-- Instructor can read/update their own inquiries
drop policy if exists "ni_instructor_rw" on public.network_inquiries;
create policy "ni_instructor_rw" on public.network_inquiries
  for all using (instructor_id = auth.uid());

-- Studio admins can read/insert their studio's inquiries
drop policy if exists "ni_studio_admin" on public.network_inquiries;
create policy "ni_studio_admin" on public.network_inquiries
  for all using (
    studio_id = private.current_studio()
    and private.current_user_role() = 'admin'
  );

-- ============================================================================
--  Inquiry messages (conversation thread)
-- ============================================================================

create table if not exists public.network_messages (
  id           uuid primary key default gen_random_uuid(),
  inquiry_id   uuid not null references public.network_inquiries(id) on delete cascade,
  sender_id    uuid not null references public.profiles(id) on delete cascade,
  body         text not null,
  created_at   timestamptz not null default now()
);

create index if not exists network_messages_inquiry_idx on public.network_messages(inquiry_id, created_at);

alter table public.network_messages enable row level security;

-- Either party in the inquiry can read and insert messages
drop policy if exists "nm_parties" on public.network_messages;
create policy "nm_parties" on public.network_messages
  for all using (
    exists (
      select 1 from public.network_inquiries ni
      where ni.id = inquiry_id
        and (
          ni.instructor_id = auth.uid()
          or (
            ni.studio_id = private.current_studio()
            and private.current_user_role() = 'admin'
          )
        )
    )
  );

-- ============================================================================
--  Auto-mark inquiry as viewed when instructor reads it
-- ============================================================================

create or replace function public.mark_inquiry_viewed(p_inquiry_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.network_inquiries
  set
    status               = case when status = 'sent' then 'viewed' else status end,
    instructor_viewed_at = coalesce(instructor_viewed_at, now()),
    updated_at           = now()
  where id = p_inquiry_id
    and instructor_id = auth.uid();
end;
$$;

grant execute on function public.mark_inquiry_viewed(uuid) to authenticated;

-- ============================================================================
--  Auto-update inquiry status when a message is sent
-- ============================================================================

create or replace function public.network_message_after_insert()
returns trigger language plpgsql security definer as $$
declare
  v_inq public.network_inquiries;
begin
  select * into v_inq from public.network_inquiries where id = new.inquiry_id;

  -- If instructor replies, mark as replied
  if new.sender_id = v_inq.instructor_id and v_inq.status in ('sent', 'viewed') then
    update public.network_inquiries
    set status = 'replied', updated_at = now()
    where id = new.inquiry_id;
  end if;

  -- bump updated_at for ordering
  update public.network_inquiries
  set updated_at = now()
  where id = new.inquiry_id;

  return new;
end;
$$;

drop trigger if exists network_message_after_insert on public.network_messages;
create trigger network_message_after_insert
  after insert on public.network_messages
  for each row execute function public.network_message_after_insert();
