-- ============================================================================
--  0067 — Performance optimizations
--
--  1. custom_access_token_hook — also embed account_kind so middleware can
--     read role + studio + account_kind from the JWT without a DB round-trip.
--
--  2. private.current_studio() / private.current_user_role() — read from the
--     JWT claim first (zero DB cost) and fall back to a profile lookup only
--     when the claim is absent (e.g. service-role callers or old tokens).
--
--  3. class_capacity — convert the plain view to a materialized view and
--     refresh it on every enrollment INSERT / UPDATE / DELETE so the admin
--     classes page no longer runs a live GROUP BY on every request.
-- ============================================================================

-- ─── 1. JWT hook — include account_kind ──────────────────────────────────────

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  claims       jsonb := event -> 'claims';
  v_role       public.user_role;
  v_studio     uuid;
  v_acct_kind  text;
begin
  select role, studio_id, account_kind
    into v_role, v_studio, v_acct_kind
    from public.profiles
   where id = (event ->> 'user_id')::uuid;

  if v_role       is not null then claims := jsonb_set(claims, '{user_role}',    to_jsonb(v_role::text));       end if;
  if v_studio     is not null then claims := jsonb_set(claims, '{studio_id}',    to_jsonb(v_studio::text));     end if;
  if v_acct_kind  is not null then claims := jsonb_set(claims, '{account_kind}', to_jsonb(v_acct_kind::text));  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;

-- ─── 2. RLS helpers — JWT-first, DB fallback ─────────────────────────────────

create or replace function private.current_studio()
returns uuid language sql stable security definer set search_path = public as $$
  select coalesce(
    nullif(auth.jwt() ->> 'studio_id', '')::uuid,
    (select studio_id from public.profiles where id = auth.uid())
  )
$$;

create or replace function private.current_user_role()
returns public.user_role language sql stable security definer set search_path = public as $$
  select coalesce(
    nullif(auth.jwt() ->> 'user_role', '')::public.user_role,
    (select role from public.profiles where id = auth.uid())
  )
$$;

-- ─── 3. Materialise class_capacity ───────────────────────────────────────────

drop view if exists public.class_capacity;

create materialized view public.class_capacity as
select
  c.id,
  c.studio_id,
  c.name,
  c.teacher_id,
  c.discipline,
  c.level,
  c.day_of_week,
  c.start_time,
  c.end_time,
  c.capacity,
  coalesce(
    count(e.id) filter (where e.status = 'active'),
    0
  )::int as enrolled
from public.classes c
left join public.enrollments e
  on e.class_id = c.id and e.studio_id = c.studio_id
group by c.id;

create unique index class_capacity_id_idx on public.class_capacity (id);
create index class_capacity_studio_idx   on public.class_capacity (studio_id);

grant select on public.class_capacity to authenticated;

-- Refresh function
create or replace function private.refresh_class_capacity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  refresh materialized view concurrently public.class_capacity;
  return coalesce(new, old);
end;
$$;

-- Trigger on enrollments — covers inserts, status changes, and deletes
drop trigger if exists refresh_capacity_on_enrollment on public.enrollments;
create trigger refresh_capacity_on_enrollment
  after insert or update of status or delete
  on public.enrollments
  for each statement
  execute function private.refresh_class_capacity();

-- Trigger on classes — covers capacity changes and new/deleted classes
drop trigger if exists refresh_capacity_on_class on public.classes;
create trigger refresh_capacity_on_class
  after insert or update of capacity or delete
  on public.classes
  for each statement
  execute function private.refresh_class_capacity();
