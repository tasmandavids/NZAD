-- ============================================================================
--  0004_waivers.sql
--  Adds waiver + waiver_signature tables for the enrollment flow.
--  A studio can define multiple waivers (e.g. liability, photo consent).
--  Parents sign each required waiver once per student before enrollment.
-- ============================================================================

-- ─── WAIVERS ────────────────────────────────────────────────────────────────

create table if not exists public.waivers (
  id          uuid primary key default gen_random_uuid(),
  studio_id   uuid not null references public.studios(id) on delete cascade,
  title       text not null,
  content     text not null,           -- Markdown or plain text body
  version     int  not null default 1, -- Bump when content changes; re-sign required
  required    bool not null default true,
  active      bool not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists waivers_studio_idx on public.waivers(studio_id);

-- ─── WAIVER SIGNATURES ──────────────────────────────────────────────────────

create table if not exists public.waiver_signatures (
  id          uuid primary key default gen_random_uuid(),
  waiver_id   uuid not null references public.waivers(id)  on delete cascade,
  student_id  uuid not null references public.profiles(id) on delete cascade,
  signed_by   uuid not null references public.profiles(id) on delete cascade,  -- parent/guardian
  waiver_version int not null,
  ip_address  text,
  signed_at   timestamptz not null default now(),
  unique (waiver_id, student_id, waiver_version)   -- one sig per waiver version per student
);

create index if not exists waiver_signatures_waiver_idx  on public.waiver_signatures(waiver_id);
create index if not exists waiver_signatures_student_idx on public.waiver_signatures(student_id);

-- ─── RLS ────────────────────────────────────────────────────────────────────

alter table public.waivers            enable row level security;
alter table public.waiver_signatures  enable row level security;

-- Waivers: studio members can read their studio's waivers
drop policy if exists "waivers_read" on public.waivers;
create policy "waivers_read" on public.waivers
  for select using (studio_id = public.current_studio());

-- Waivers: admins can manage waivers
drop policy if exists "waivers_admin_all" on public.waivers;
create policy "waivers_admin_all" on public.waivers
  for all using (
    studio_id = public.current_studio()
    and public.current_user_role() = 'admin'
  );

-- Waiver signatures: parents can insert for their own children
drop policy if exists "waiver_sigs_parent_insert" on public.waiver_signatures;
create policy "waiver_sigs_parent_insert" on public.waiver_signatures
  for insert with check (
    signed_by = auth.uid()
    and public.is_my_child(student_id)
  );

-- Waiver signatures: parents can read signatures for their children
drop policy if exists "waiver_sigs_parent_read" on public.waiver_signatures;
create policy "waiver_sigs_parent_read" on public.waiver_signatures
  for select using (
    signed_by = auth.uid()
    or public.is_my_child(student_id)
  );

-- Waiver signatures: admins can read all signatures in their studio
drop policy if exists "waiver_sigs_admin_read" on public.waiver_signatures;
create policy "waiver_sigs_admin_read" on public.waiver_signatures
  for select using (
    public.current_user_role() = 'admin'
    and exists (
      select 1 from public.waivers w
      where w.id = waiver_id and w.studio_id = public.current_studio()
    )
  );

-- ─── GRANT public schema usage for Supabase anon / service roles ─────────────

grant select, insert on public.waivers           to anon, authenticated;
grant select, insert on public.waiver_signatures to anon, authenticated;
