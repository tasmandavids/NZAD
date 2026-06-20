-- ============================================================================
--  0050_public_enrol_leads.sql
--  Allow anonymous visitors to submit trial requests from /enrol into leads.
-- ============================================================================

drop policy if exists "leads_public_trial_insert" on public.leads;
create policy "leads_public_trial_insert" on public.leads
  for insert to anon
  with check (
    status in ('new', 'trial')
    and source = 'enrol-page'
    and exists (
      select 1 from public.studios s
      where s.id = studio_id and s.status <> 'suspended'
    )
  );

grant insert on public.leads to anon;
