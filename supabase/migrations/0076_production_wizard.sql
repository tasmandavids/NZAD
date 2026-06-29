-- ============================================================================
--  0069_production_wizard.sql
--  Full production wizard extension — performances, crew, cast, acts,
--  participants, music cues, and stage/lighting cues.
-- ============================================================================

-- ─── Extend events table ─────────────────────────────────────────────────────
alter table public.events
  add column if not exists event_type text not null default 'recital'
    check (event_type in ('recital','showcase','concert','competition','workshop','other')),
  add column if not exists stage_type text not null default 'proscenium'
    check (stage_type in ('proscenium','thrust','in_the_round','black_box','other')),
  add column if not exists stage_width_m  numeric(5,1),
  add column if not exists stage_depth_m  numeric(5,1),
  add column if not exists venue_notes    text,
  add column if not exists tech_notes     text,
  add column if not exists quick_change_threshold_mins integer not null default 10;

-- ─── event_performances ──────────────────────────────────────────────────────
-- Multiple dates/times per event (matinee + evening, multi-night runs).
create table if not exists public.event_performances (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events(id) on delete cascade,
  perf_date    date not null,
  doors_open   time,
  curtain_up   time not null,
  expected_end time,
  notes        text,
  created_at   timestamptz not null default now()
);
create index if not exists event_performances_event_idx on public.event_performances(event_id);

-- ─── event_crew ──────────────────────────────────────────────────────────────
-- Organizers and technical crew for an event.
-- profile_id is null for external (non-Olune) crew.
create table if not exists public.event_crew (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events(id) on delete cascade,
  profile_id   uuid references public.profiles(id) on delete set null,
  display_name text not null,
  role_label   text not null,
  phone        text,
  email        text,
  is_external  boolean not null default false,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists event_crew_event_idx on public.event_crew(event_id);

-- ─── event_cast_groups ───────────────────────────────────────────────────────
-- Named cast groups: Principals, Junior Ensemble, Senior Company, etc.
create table if not exists public.event_cast_groups (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  name       text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists event_cast_groups_event_idx on public.event_cast_groups(event_id);

-- ─── event_cast_members ──────────────────────────────────────────────────────
-- Students assigned to an event, with optional group and base costume.
create table if not exists public.event_cast_members (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references public.events(id) on delete cascade,
  group_id      uuid references public.event_cast_groups(id) on delete set null,
  profile_id    uuid not null references public.profiles(id) on delete cascade,
  display_name  text not null,
  role_label    text not null default 'Ensemble',
  base_costume  text,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  unique (event_id, profile_id)
);
create index if not exists event_cast_members_event_idx  on public.event_cast_members(event_id);
create index if not exists event_cast_members_group_idx  on public.event_cast_members(group_id);

-- ─── event_acts ──────────────────────────────────────────────────────────────
-- Ordered lineup items for the show.
create table if not exists public.event_acts (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references public.events(id) on delete cascade,
  title         text not null default '',
  act_type      text not null default 'number'
                  check (act_type in ('number','speech','awards','intermission','video','scene_change','other')),
  duration_secs integer,
  notes         text,
  order_index   integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists event_acts_event_idx on public.event_acts(event_id, order_index);

drop trigger if exists event_acts_touch_updated_at on public.event_acts;
create trigger event_acts_touch_updated_at
  before update on public.event_acts
  for each row execute function private.touch_updated_at();

-- ─── event_act_participants ───────────────────────────────────────────────────
-- Cast members in each act, with optional costume override for that act.
create table if not exists public.event_act_participants (
  id              uuid primary key default gen_random_uuid(),
  act_id          uuid not null references public.event_acts(id) on delete cascade,
  cast_member_id  uuid not null references public.event_cast_members(id) on delete cascade,
  costume_override text,
  created_at      timestamptz not null default now(),
  unique (act_id, cast_member_id)
);
create index if not exists event_act_participants_act_idx on public.event_act_participants(act_id);

-- ─── event_act_music ─────────────────────────────────────────────────────────
-- Music cue per act — Spotify or Apple Music URL + cached metadata.
create table if not exists public.event_act_music (
  id            uuid primary key default gen_random_uuid(),
  act_id        uuid not null references public.event_acts(id) on delete cascade unique,
  source_url    text not null,
  source_type   text not null default 'spotify'
                  check (source_type in ('spotify','apple_music','other')),
  track_title   text,
  artist        text,
  album         text,
  thumbnail_url text,
  duration_secs integer,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

drop trigger if exists event_act_music_touch_updated_at on public.event_act_music;
create trigger event_act_music_touch_updated_at
  before update on public.event_act_music
  for each row execute function private.touch_updated_at();

-- ─── event_act_cues ──────────────────────────────────────────────────────────
-- Stage/lighting/scenery state per act. Stored as JSON for maximum flexibility.
-- lights:    array of { id, active, colorPreset }
-- formations: array of { castMemberId, name, x, y }  (0–100 % of stage)
create table if not exists public.event_act_cues (
  id             uuid primary key default gen_random_uuid(),
  act_id         uuid not null references public.event_acts(id) on delete cascade unique,
  lights         jsonb not null default '[]',
  backdrop       text,
  scenery_notes  text,
  formations     jsonb not null default '[]',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

drop trigger if exists event_act_cues_touch_updated_at on public.event_act_cues;
create trigger event_act_cues_touch_updated_at
  before update on public.event_act_cues
  for each row execute function private.touch_updated_at();

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table public.event_performances    enable row level security;
alter table public.event_crew            enable row level security;
alter table public.event_cast_groups     enable row level security;
alter table public.event_cast_members    enable row level security;
alter table public.event_acts            enable row level security;
alter table public.event_act_participants enable row level security;
alter table public.event_act_music       enable row level security;
alter table public.event_act_cues        enable row level security;

-- Helper: check act belongs to the current admin's studio
create or replace function public.act_belongs_to_admin(p_act_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.event_acts ea
    join public.events e on e.id = ea.event_id
    where ea.id = p_act_id
      and e.studio_id = private.current_studio()
      and private.current_user_role() = 'admin'
  );
$$;

-- event_performances
drop policy if exists "ep_admin_all" on public.event_performances;
create policy "ep_admin_all" on public.event_performances for all using (
  exists (
    select 1 from public.events e
    where e.id = event_id
      and e.studio_id = private.current_studio()
      and private.current_user_role() = 'admin'
  )
);

-- event_crew
drop policy if exists "ecrew_admin_all" on public.event_crew;
create policy "ecrew_admin_all" on public.event_crew for all using (
  exists (
    select 1 from public.events e
    where e.id = event_id
      and e.studio_id = private.current_studio()
      and private.current_user_role() = 'admin'
  )
);

-- event_cast_groups
drop policy if exists "ecg_admin_all" on public.event_cast_groups;
create policy "ecg_admin_all" on public.event_cast_groups for all using (
  exists (
    select 1 from public.events e
    where e.id = event_id
      and e.studio_id = private.current_studio()
      and private.current_user_role() = 'admin'
  )
);

-- event_cast_members
drop policy if exists "ecm_admin_all" on public.event_cast_members;
create policy "ecm_admin_all" on public.event_cast_members for all using (
  exists (
    select 1 from public.events e
    where e.id = event_id
      and e.studio_id = private.current_studio()
      and private.current_user_role() = 'admin'
  )
);

-- event_acts
drop policy if exists "ea_admin_all" on public.event_acts;
create policy "ea_admin_all" on public.event_acts for all using (
  exists (
    select 1 from public.events e
    where e.id = event_id
      and e.studio_id = private.current_studio()
      and private.current_user_role() = 'admin'
  )
);

-- event_act_participants
drop policy if exists "eap_admin_all" on public.event_act_participants;
create policy "eap_admin_all" on public.event_act_participants for all using (
  public.act_belongs_to_admin(act_id)
);

-- event_act_music
drop policy if exists "eam_admin_all" on public.event_act_music;
create policy "eam_admin_all" on public.event_act_music for all using (
  public.act_belongs_to_admin(act_id)
);

-- event_act_cues
drop policy if exists "eac_admin_all" on public.event_act_cues;
create policy "eac_admin_all" on public.event_act_cues for all using (
  public.act_belongs_to_admin(act_id)
);

-- ─── Grants ──────────────────────────────────────────────────────────────────
grant select, insert, update, delete on public.event_performances     to authenticated;
grant select, insert, update, delete on public.event_crew             to authenticated;
grant select, insert, update, delete on public.event_cast_groups      to authenticated;
grant select, insert, update, delete on public.event_cast_members     to authenticated;
grant select, insert, update, delete on public.event_acts             to authenticated;
grant select, insert, update, delete on public.event_act_participants to authenticated;
grant select, insert, update, delete on public.event_act_music        to authenticated;
grant select, insert, update, delete on public.event_act_cues         to authenticated;
