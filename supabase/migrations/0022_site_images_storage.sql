-- ============================================================================
--  0022 — Site builder image uploads: Supabase Storage bucket   (Session 11)
--
--  Studio admins upload images (hero backgrounds, gallery photos, logos…) for
--  their public website. Files live in a single PUBLIC bucket, namespaced by
--  studio:   site-images/<studio_id>/<random>.<ext>
--
--  Reads are public (the website is server-rendered with the anon key and the
--  <img> tags are loaded by anonymous browsers). Writes are restricted to the
--  studio's own admins via RLS on storage.objects.
--
--  Note: uploads in the app go through a signed-upload URL minted server-side
--  with the service-role key (see app/portal/admin/site/upload-actions.ts), so
--  the write succeeds even where storage RLS DDL could not be applied. These
--  policies are defence-in-depth + enable a direct authenticated-client upload
--  fallback.
-- ============================================================================

-- Public bucket (idempotent).
insert into storage.buckets (id, name, public)
values ('site-images', 'site-images', true)
on conflict (id) do update set public = true;

-- ─── RLS on storage.objects (scoped to this bucket) ──────────────────────────
-- The first path segment is the studio id:  <studio_id>/<file>
-- storage.foldername(name) returns the folder segments as a text[].

drop policy if exists "site_images_public_read" on storage.objects;
create policy "site_images_public_read" on storage.objects
  for select
  using (bucket_id = 'site-images');

drop policy if exists "site_images_admin_insert" on storage.objects;
create policy "site_images_admin_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'site-images'
    and public.current_user_role() = 'admin'
    and (storage.foldername(name))[1] = public.current_studio()::text
  );

drop policy if exists "site_images_admin_update" on storage.objects;
create policy "site_images_admin_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'site-images'
    and public.current_user_role() = 'admin'
    and (storage.foldername(name))[1] = public.current_studio()::text
  )
  with check (
    bucket_id = 'site-images'
    and public.current_user_role() = 'admin'
    and (storage.foldername(name))[1] = public.current_studio()::text
  );

drop policy if exists "site_images_admin_delete" on storage.objects;
create policy "site_images_admin_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'site-images'
    and public.current_user_role() = 'admin'
    and (storage.foldername(name))[1] = public.current_studio()::text
  );
