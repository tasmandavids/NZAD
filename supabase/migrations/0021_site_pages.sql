-- ============================================================================
--  0021 — Custom site builder: per-studio public pages   (Session 10)
--
--  Each studio builds its own public-facing website from a stack of content
--  blocks. A page stores its layout as a JSON array of blocks (see
--  lib/site/blocks.ts for the shape). The public site renders PUBLISHED pages;
--  the admin editor manages drafts.
--
--  RLS:
--    • admin of the studio → full access (current_studio() + role check)
--    • anyone (incl. anon visitors) → read PUBLISHED pages only
--      (the public website is server-rendered with the anon key)
-- ============================================================================

create table if not exists public.site_pages (
  id              uuid primary key default gen_random_uuid(),
  studio_id       uuid not null references public.studios(id) on delete cascade,
  slug            text not null,                       -- url path segment, e.g. 'about' ('' or 'home' for the homepage)
  title           text not null default 'Untitled page',
  blocks          jsonb not null default '[]'::jsonb,  -- ordered array of block objects
  status          text not null default 'draft'
                    check (status in ('draft', 'published')),
  is_home         boolean not null default false,
  show_in_nav     boolean not null default true,
  nav_label       text,                                -- falls back to title in the nav
  nav_order       integer not null default 0,
  seo_title       text,
  seo_description text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (studio_id, slug)
);

create index if not exists site_pages_studio_idx on public.site_pages(studio_id);
create index if not exists site_pages_studio_status_idx on public.site_pages(studio_id, status);

-- At most one homepage per studio.
create unique index if not exists site_pages_one_home
  on public.site_pages(studio_id) where is_home;

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table public.site_pages enable row level security;

-- Admins manage their studio's pages (drafts + published).
drop policy if exists "site_pages_admin_all" on public.site_pages;
create policy "site_pages_admin_all" on public.site_pages
  for all using (
    studio_id = public.current_studio()
    and public.current_user_role() = 'admin'
  )
  with check (
    studio_id = public.current_studio()
    and public.current_user_role() = 'admin'
  );

-- Anyone (including anonymous visitors) can read PUBLISHED pages. No auth
-- helpers here so the public site renders for logged-out prospects.
drop policy if exists "site_pages_public_read" on public.site_pages;
create policy "site_pages_public_read" on public.site_pages
  for select using (status = 'published');

grant select on public.site_pages to anon, authenticated;
grant insert, update, delete on public.site_pages to authenticated;
