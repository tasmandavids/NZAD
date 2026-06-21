-- ============================================================================
--  0053 — Scope RLS to the user's active studio workspace.
--  Aligns private.current_studio() with the JWT hook (active_studio_id first).
-- ============================================================================

create or replace function private.current_studio()
returns uuid language sql stable security definer set search_path = public as $$
  select coalesce(p.active_studio_id, p.studio_id)
  from public.profiles p
  where p.id = auth.uid()
$$;
