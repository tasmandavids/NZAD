-- ============================================================================
--  Olune · migration 0001_tenant_branding
--  The multi-tenant backbone: studios (tenants), per-studio branding, profiles,
--  and Row-Level Security that isolates every studio's data AT THE DATABASE.
--
--  Apply:  supabase db push      (or paste into Supabase Studio → SQL editor)
-- ============================================================================

do $$ begin
  create type public.user_role as enum ('admin','teacher','parent','student');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.theme_base as enum ('dark','light');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
--  STUDIOS — the tenant root. Everything else hangs off studio_id.
-- ---------------------------------------------------------------------------
create table if not exists public.studios (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text not null unique,            -- subdomain: <slug>.olune.app
  custom_domain text unique,                     -- optional: book.mystudio.co.nz
  status        text not null default 'trial',   -- trial | active | suspended
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
--  STUDIO_BRANDING — one row per studio. This is what runtime theming reads.
--  Admins pick ONE brand_color; brand_hot / brand_deep are derived and cached
--  here so server-side rendering never has to recompute them.
-- ---------------------------------------------------------------------------
create table if not exists public.studio_branding (
  studio_id    uuid primary key references public.studios(id) on delete cascade,
  tagline      text,
  logo_url     text,
  brand_color  text not null default '#C8102E',
  brand_hot    text,
  brand_deep   text,
  base         public.theme_base not null default 'dark',
  font_display text not null default 'Archivo',
  font_body    text not null default 'Archivo',
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
--  PROFILES — 1:1 with auth.users; carries the tenant link + role.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  studio_id  uuid references public.studios(id) on delete cascade,
  role       public.user_role not null default 'parent',
  full_name  text,
  phone      text,
  created_at timestamptz not null default now()
);
create index if not exists profiles_studio_idx on public.profiles(studio_id);

-- ---------------------------------------------------------------------------
--  TENANT CONTEXT HELPERS
--  SECURITY DEFINER so they can read profiles without tripping profiles' own
--  RLS — this prevents infinite recursion when the helpers are used inside a
--  policy ON the profiles table.
-- ---------------------------------------------------------------------------
create or replace function public.current_studio()
returns uuid language sql stable security definer set search_path = public as $$
  select studio_id from public.profiles where id = auth.uid()
$$;

create or replace function public.current_user_role()
returns public.user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

-- ---------------------------------------------------------------------------
--  ROW-LEVEL SECURITY
--  Identity (name/slug/logo/colours) is public — it appears on the studio's
--  own marketing site anyway, and the public site must render before login.
--  Everything sensitive (profiles, and later students/payments/etc.) stays
--  locked to current_studio() + role.
-- ---------------------------------------------------------------------------
alter table public.studios         enable row level security;
alter table public.studio_branding enable row level security;
alter table public.profiles        enable row level security;

-- STUDIOS
drop policy if exists "public reads active studios" on public.studios;
create policy "public reads active studios" on public.studios
  for select using (status <> 'suspended');
drop policy if exists "admins update own studio" on public.studios;
create policy "admins update own studio" on public.studios
  for update using (id = public.current_studio() and public.current_user_role() = 'admin')
          with check (id = public.current_studio() and public.current_user_role() = 'admin');

-- BRANDING
drop policy if exists "public reads branding" on public.studio_branding;
create policy "public reads branding" on public.studio_branding
  for select using (true);
drop policy if exists "admins write own branding" on public.studio_branding;
create policy "admins write own branding" on public.studio_branding
  for all using (studio_id = public.current_studio() and public.current_user_role() = 'admin')
          with check (studio_id = public.current_studio() and public.current_user_role() = 'admin');

-- PROFILES (NOT public — tenant + role scoped)
drop policy if exists "read profiles in own studio" on public.profiles;
create policy "read profiles in own studio" on public.profiles
  for select using (studio_id = public.current_studio());
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
  for update using (id = auth.uid());
drop policy if exists "admins manage studio profiles" on public.profiles;
create policy "admins manage studio profiles" on public.profiles
  for all using (studio_id = public.current_studio() and public.current_user_role() = 'admin')
          with check (studio_id = public.current_studio() and public.current_user_role() = 'admin');

-- ---------------------------------------------------------------------------
--  SIGNUP — every new auth user gets a bare profile. The studio link is set
--  during onboarding (create_studio_for_user, below).
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
--  ONBOARDING — a new owner creates their studio and becomes its admin in one
--  transaction. SECURITY DEFINER so it can write across tables atomically.
--  App call:  supabase.rpc('create_studio_for_user', { p_name, p_slug })
-- ---------------------------------------------------------------------------
create or replace function public.create_studio_for_user(p_name text, p_slug text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_studio uuid;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if (select studio_id from public.profiles where id = v_uid) is not null then
    raise exception 'user already belongs to a studio';
  end if;

  insert into public.studios (name, slug, status)
    values (p_name, lower(p_slug), 'trial')
    returning id into v_studio;

  insert into public.studio_branding (studio_id) values (v_studio);   -- defaults

  update public.profiles set studio_id = v_studio, role = 'admin' where id = v_uid;

  return v_studio;
end $$;
