-- ============================================================================
--  0054 — Restrict public catalog RLS to anon only.
--  Authenticated portal users must use studio-scoped policies (current_studio).
--  Without `to anon`, logged-in admins could read every studio's catalog rows.
-- ============================================================================

drop policy if exists "classes_public_catalog" on public.classes;
create policy "classes_public_catalog" on public.classes
  for select to anon
  using (
    exists (
      select 1 from public.studios s
      where s.id = studio_id and s.status <> 'suspended'
    )
  );

drop policy if exists "events_public_anon_read" on public.events;
create policy "events_public_anon_read" on public.events
  for select to anon
  using (
    status = 'published'
    and exists (
      select 1 from public.studios s
      where s.id = studio_id and s.status <> 'suspended'
    )
  );

drop policy if exists "products_public_catalog" on public.products;
create policy "products_public_catalog" on public.products
  for select to anon
  using (
    active = true
    and exists (
      select 1 from public.studios s
      where s.id = studio_id and s.status <> 'suspended'
    )
  );
