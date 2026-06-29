-- ============================================================================
--  0073_instructor_profile_and_term_plans.sql
--  Public instructor profile fields + term payment plan admin actions
-- ============================================================================

-- Instructor public profile fields on profiles
alter table public.profiles
  add column if not exists bio              text,
  add column if not exists headline         text,           -- short tagline
  add column if not exists disciplines      text[],         -- e.g. ['Ballet','Hip Hop']
  add column if not exists location_city    text,
  add column if not exists profile_public   boolean not null default false,
  add column if not exists avatar_url       text,
  add column if not exists website_url      text;

-- Public read of instructor profiles (only when profile_public = true)
drop policy if exists "profiles_instructor_public_read" on public.profiles;
create policy "profiles_instructor_public_read" on public.profiles
  for select using (
    profile_public = true
    and account_kind = 'instructor'
  );

-- Term payment plan admin actions: record manual installment payment
create or replace function public.admin_record_installment_payment(
  p_plan_id     uuid,
  p_amount_cents int
)
returns void language plpgsql security definer as $$
declare
  v_plan public.term_payment_plans;
begin
  select * into v_plan from public.term_payment_plans where id = p_plan_id;
  if not found then raise exception 'Plan not found'; end if;

  update public.term_payment_plans
  set
    installments_paid  = installments_paid + 1,
    amount_paid_cents  = amount_paid_cents + p_amount_cents,
    status             = case
      when installments_paid + 1 >= installment_count then 'completed'
      else status
    end,
    completed_at = case
      when installments_paid + 1 >= installment_count then now()
      else null
    end,
    next_due_date = case
      when installments_paid + 1 < installment_count
        then (next_due_date + interval '1 month')::date
      else null
    end
  where id = p_plan_id;
end;
$$;

grant execute on function public.admin_record_installment_payment(uuid, int) to authenticated;
