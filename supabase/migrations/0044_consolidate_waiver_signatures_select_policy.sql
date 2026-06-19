-- Consolidate duplicate permissive SELECT policies on waiver_signatures.
-- Parent and admin read rules are merged into one policy for better RLS performance.

drop policy if exists "waiver_sigs_parent_read" on public.waiver_signatures;
drop policy if exists "waiver_sigs_admin_read" on public.waiver_signatures;

create policy "waiver_sigs_read" on public.waiver_signatures
  for select
  using (
    signed_by = auth.uid()
    or public.is_my_child(student_id)
    or (
      public.current_user_role() = 'admin'
      and exists (
        select 1
        from public.waivers w
        where w.id = waiver_id
          and w.studio_id = public.current_studio()
      )
    )
  );
