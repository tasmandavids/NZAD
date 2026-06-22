-- ============================================================================
--  0057 — Site Builder v2 (Studio)   [PREVIEW / compartmentalized]
--
--  The rebuilt visual builder stores its page as a single normalized JSON
--  document (see lib/builder/schema.ts) in a DEDICATED table, separate from the
--  v1 `site_pages.blocks` column. This isolation is deliberate: the v1 public
--  site and admin editor never touch this table, and nothing here can regress
--  them. A row links 1:1 to an existing site_pages row.
--
--  RLS mirrors site_pages:
--    • admin of the studio → full access
--    • anyone → read documents whose linked page is PUBLISHED (future public
--      rendering / shareable preview)
-- ============================================================================

create table if not exists public.site_builder_documents (
  page_id     uuid primary key references public.site_pages(id) on delete cascade,
  studio_id   uuid not null references public.studios(id) on delete cascade,
  document    jsonb not null default '{}'::jsonb,
  template_id text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists site_builder_documents_studio_idx
  on public.site_builder_documents(studio_id);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table public.site_builder_documents enable row level security;

-- Admins manage their own studio's builder documents. Tenant/role helpers live
-- in the `private` schema (migration 0048 dropped the old public.* versions and
-- moved them there); every policy from 0048 onward uses private.current_studio()
-- / private.current_user_role().
drop policy if exists "sbd_admin_all" on public.site_builder_documents;
create policy "sbd_admin_all" on public.site_builder_documents
  for all using (
    studio_id = private.current_studio()
    and private.current_user_role() = 'admin'
  )
  with check (
    studio_id = private.current_studio()
    and private.current_user_role() = 'admin'
  );

-- Anyone can read a document whose linked page is published.
drop policy if exists "sbd_public_read" on public.site_builder_documents;
create policy "sbd_public_read" on public.site_builder_documents
  for select using (
    exists (
      select 1 from public.site_pages p
      where p.id = site_builder_documents.page_id
        and p.status = 'published'
    )
  );

grant select on public.site_builder_documents to anon, authenticated;
grant insert, update, delete on public.site_builder_documents to authenticated;
