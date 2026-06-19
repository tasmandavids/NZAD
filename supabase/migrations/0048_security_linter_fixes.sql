-- ============================================================================
--  0048 — Supabase database linter security fixes
--
--  Resolves:
--    0011 function_search_path_mutable
--    0025 public_bucket_allows_listing
--    0028 anon_security_definer_function_executable
--    0029 authenticated_security_definer_function_executable
--
--  RLS helpers and trigger functions move to the non-API `private` schema so
--  authenticated users retain EXECUTE for policy evaluation without exposing
--  SECURITY DEFINER RPC endpoints on /rest/v1/rpc/*.
-- ============================================================================

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role, postgres;

-- ─── RLS helpers (used in policies, not exposed via PostgREST) ───────────────

create or replace function private.current_studio()
returns uuid language sql stable security definer set search_path = public as $$
  select studio_id from public.profiles where id = auth.uid()
$$;

create or replace function private.current_user_role()
returns public.user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function private.is_my_child(p_student uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.guardianships
    where guardian_id = auth.uid() and student_id = p_student
  )
$$;

create or replace function private.teaches_class(p_class uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.classes where id = p_class and teacher_id = auth.uid()
  )
$$;

create or replace function private.teaches_student(p_student uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.enrollments e
    join public.classes c on c.id = e.class_id
    where e.student_id = p_student and c.teacher_id = auth.uid()
  )
$$;

create or replace function private.is_platform_operator()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.platform_operators where user_id = auth.uid()
  )
$$;

create or replace function private.is_studio_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select private.current_user_role() in ('admin', 'office')
$$;

grant execute on function private.current_studio() to authenticated, service_role;
grant execute on function private.current_user_role() to authenticated, service_role;
grant execute on function private.is_my_child(uuid) to authenticated, service_role;
grant execute on function private.teaches_class(uuid) to authenticated, service_role;
grant execute on function private.teaches_student(uuid) to authenticated, service_role;
grant execute on function private.is_platform_operator() to authenticated, service_role;
grant execute on function private.is_studio_admin() to authenticated, service_role;

-- ─── Trigger / internal functions (private schema, no API access) ──────────

create or replace function private.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.guard_profile_privileges()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user = 'authenticated'
     and (new.role is distinct from old.role or new.studio_id is distinct from old.studio_id)
     and private.current_user_role() is distinct from 'admin'
  then
    raise exception 'Only admins may change role or studio_id (attempted by %).', auth.uid();
  end if;
  return new;
end;
$$;

create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_name text;
begin
  v_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(trim(concat_ws(' ',
      new.raw_user_meta_data ->> 'given_name',
      new.raw_user_meta_data ->> 'family_name'
    )), ''),
    nullif(trim(concat_ws(' ',
      new.raw_user_meta_data #>> '{full_name,givenName}',
      new.raw_user_meta_data #>> '{full_name,familyName}'
    )), '')
  );

  insert into public.profiles (id, full_name)
  values (new.id, v_name)
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function private.notify_enrollment_confirmed()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_class_name text;
begin
  select c.name into v_class_name
    from public.classes c where c.id = new.class_id;

  insert into public.notifications(studio_id, user_id, type, title, body, link)
  values (
    new.studio_id,
    new.student_id,
    'enrollment_confirmed',
    'Enrolled in ' || coalesce(v_class_name, 'class'),
    'You have been successfully enrolled. See you there!',
    '/portal/student'
  );

  return new;
end;
$$;

create or replace function private.notify_invoice_overdue()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status <> 'overdue' and new.status = 'overdue' then
    insert into public.notifications(studio_id, user_id, type, title, body, link, payload)
    values (
      new.studio_id,
      new.payer_id,
      'invoice_overdue',
      'Payment overdue',
      'An invoice of $' || (new.amount_cents / 100.0)::numeric(10,2) || ' is overdue.',
      '/portal/parent',
      jsonb_build_object('invoice_id', new.id, 'amount_cents', new.amount_cents)
    );
  end if;
  return new;
end;
$$;

create or replace function private.notify_message_received()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_sender_name text;
begin
  select coalesce(first_name || ' ' || last_name, email)
    into v_sender_name
    from public.profiles where id = new.from_user_id;

  insert into public.notifications(studio_id, user_id, type, title, body, link, payload)
  values (
    new.studio_id,
    new.to_user_id,
    'message_received',
    'New message from ' || coalesce(v_sender_name, 'Someone'),
    left(new.body, 120),
    '/portal/admin/messages',
    jsonb_build_object('from_user_id', new.from_user_id)
  );
  return new;
end;
$$;

create or replace function private.sync_event_sold_tickets()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.events
  set sold_tickets = (
    select coalesce(sum(quantity), 0)
    from public.event_tickets
    where event_id = coalesce(new.event_id, old.event_id)
      and status in ('reserved', 'paid')
  )
  where id = coalesce(new.event_id, old.event_id);
  return coalesce(new, old);
end;
$$;

create or replace function private.decrement_stock_on_order()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status <> 'paid' and new.status = 'paid' then
    update public.products p
    set stock_qty = p.stock_qty - oi.qty
    from public.order_items oi
    where oi.order_id = new.id
      and oi.product_id = p.id;
  end if;
  return new;
end;
$$;

create or replace function private.restock_on_order_refund()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status = 'paid' and new.status = 'refunded' then
    update public.products p
    set stock_qty = p.stock_qty + oi.qty
    from public.order_items oi
    where oi.order_id = new.id
      and oi.product_id = p.id;
  end if;
  return new;
end;
$$;

create or replace function private.promote_waitlist()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_class_id    uuid := old.class_id;
  v_studio_id   uuid := old.studio_id;
  v_capacity    int;
  v_class_name  text;
  v_active      int;
  v_next        public.enrollments%rowtype;
begin
  if old.status is distinct from 'active' then
    return coalesce(new, old);
  end if;

  if tg_op = 'UPDATE' and new.status = 'active' then
    return new;
  end if;

  select capacity, name
    into v_capacity, v_class_name
    from public.classes
    where id = v_class_id;

  if v_capacity is null then
    return coalesce(new, old);
  end if;

  select count(*) into v_active
    from public.enrollments
    where class_id = v_class_id and status = 'active';

  while v_active < v_capacity loop
    select * into v_next
      from public.enrollments
      where class_id = v_class_id and status = 'waitlisted'
      order by enrolled_at asc
      limit 1;

    exit when v_next.id is null;

    update public.enrollments
      set status = 'active'
      where id = v_next.id;

    insert into public.notifications(studio_id, user_id, type, title, body, link)
    values (
      v_studio_id,
      v_next.student_id,
      'waitlist_promoted',
      'A spot opened in ' || coalesce(v_class_name, 'your class'),
      'You''ve been moved off the waitlist and are now enrolled. See you there!',
      '/portal/student'
    );

    v_active := v_active + 1;
  end loop;

  return coalesce(new, old);
end;
$$;

-- ─── Harden remaining public functions (intentional RPC / auth hooks) ────────

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  claims   jsonb := event -> 'claims';
  v_role   public.user_role;
  v_studio uuid;
begin
  select role, studio_id into v_role, v_studio
  from public.profiles where id = (event ->> 'user_id')::uuid;

  if v_role   is not null then claims := jsonb_set(claims, '{user_role}', to_jsonb(v_role::text)); end if;
  if v_studio is not null then claims := jsonb_set(claims, '{studio_id}', to_jsonb(v_studio::text)); end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;

-- ─── Repoint triggers to private functions ───────────────────────────────────

drop trigger if exists profiles_guard_privileges on public.profiles;
create trigger profiles_guard_privileges
  before update on public.profiles
  for each row execute function private.guard_profile_privileges();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

drop trigger if exists leads_touch_updated_at on public.leads;
create trigger leads_touch_updated_at
  before update on public.leads
  for each row execute function private.touch_updated_at();

drop trigger if exists products_touch_updated_at on public.products;
create trigger products_touch_updated_at
  before update on public.products
  for each row execute function private.touch_updated_at();

drop trigger if exists orders_touch_updated_at on public.orders;
create trigger orders_touch_updated_at
  before update on public.orders
  for each row execute function private.touch_updated_at();

drop trigger if exists events_touch_updated_at on public.events;
create trigger events_touch_updated_at
  before update on public.events
  for each row execute function private.touch_updated_at();

do $$
begin
  if to_regclass('public.staff_members') is not null then
    drop trigger if exists staff_members_updated_at on public.staff_members;
    create trigger staff_members_updated_at
      before update on public.staff_members
      for each row execute function private.touch_updated_at();
  end if;

  if to_regclass('public.staff_shifts') is not null then
    drop trigger if exists staff_shifts_updated_at on public.staff_shifts;
    create trigger staff_shifts_updated_at
      before update on public.staff_shifts
      for each row execute function private.touch_updated_at();
  end if;

  if to_regclass('public.staff') is not null then
    drop trigger if exists staff_touch_updated_at on public.staff;
    create trigger staff_touch_updated_at
      before update on public.staff
      for each row execute function private.touch_updated_at();
  end if;
end;
$$;

drop trigger if exists enrollment_notify_trigger on public.enrollments;
create trigger enrollment_notify_trigger
  after insert on public.enrollments
  for each row
  when (new.status = 'active')
  execute function private.notify_enrollment_confirmed();

drop trigger if exists invoice_overdue_notify_trigger on public.invoices;
create trigger invoice_overdue_notify_trigger
  after update of status on public.invoices
  for each row execute function private.notify_invoice_overdue();

drop trigger if exists message_received_notify_trigger on public.messages;
create trigger message_received_notify_trigger
  after insert on public.messages
  for each row execute function private.notify_message_received();

drop trigger if exists event_tickets_sync on public.event_tickets;
create trigger event_tickets_sync
  after insert or update of status, quantity or delete on public.event_tickets
  for each row execute function private.sync_event_sold_tickets();

drop trigger if exists order_paid_decrement_stock on public.orders;
create trigger order_paid_decrement_stock
  after update of status on public.orders
  for each row execute function private.decrement_stock_on_order();

drop trigger if exists order_refunded_restock on public.orders;
create trigger order_refunded_restock
  after update of status on public.orders
  for each row execute function private.restock_on_order_refund();

drop trigger if exists waitlist_promote_trigger on public.enrollments;
create trigger waitlist_promote_trigger
  after update or delete on public.enrollments
  for each row execute function private.promote_waitlist();

-- ─── Migrate RLS policies: public.* helpers → private.* ─────────────────────

create or replace function private.migrate_policy_expr(expr text)
returns text language plpgsql immutable as $$
declare
  out text := expr;
begin
  if out is null then
    return null;
  end if;

  -- Protect already-migrated private references from double replacement.
  out := replace(out, 'private.current_studio()', chr(1) || 'CS' || chr(1));
  out := replace(out, 'private.current_user_role()', chr(1) || 'CUR' || chr(1));
  out := replace(out, 'private.is_my_child(', chr(1) || 'IMC' || chr(1));
  out := replace(out, 'private.teaches_class(', chr(1) || 'TC' || chr(1));
  out := replace(out, 'private.teaches_student(', chr(1) || 'TS' || chr(1));
  out := replace(out, 'private.is_platform_operator()', chr(1) || 'IPO' || chr(1));
  out := replace(out, 'private.is_studio_admin()', chr(1) || 'ISA' || chr(1));

  out := replace(out, 'public.current_studio()', 'private.current_studio()');
  out := replace(out, 'public.current_user_role()', 'private.current_user_role()');
  out := replace(out, 'public.is_my_child(', 'private.is_my_child(');
  out := replace(out, 'public.teaches_class(', 'private.teaches_class(');
  out := replace(out, 'public.teaches_student(', 'private.teaches_student(');
  out := replace(out, 'public.is_platform_operator()', 'private.is_platform_operator()');
  out := replace(out, 'public.is_studio_admin()', 'private.is_studio_admin()');

  out := replace(out, 'current_studio()', 'private.current_studio()');
  out := replace(out, 'current_user_role()', 'private.current_user_role()');
  out := replace(out, 'is_my_child(', 'private.is_my_child(');
  out := replace(out, 'teaches_class(', 'private.teaches_class(');
  out := replace(out, 'teaches_student(', 'private.teaches_student(');
  out := replace(out, 'is_platform_operator()', 'private.is_platform_operator()');
  out := replace(out, 'is_studio_admin()', 'private.is_studio_admin()');

  out := replace(out, chr(1) || 'CS' || chr(1), 'private.current_studio()');
  out := replace(out, chr(1) || 'CUR' || chr(1), 'private.current_user_role()');
  out := replace(out, chr(1) || 'IMC' || chr(1), 'private.is_my_child(');
  out := replace(out, chr(1) || 'TC' || chr(1), 'private.teaches_class(');
  out := replace(out, chr(1) || 'TS' || chr(1), 'private.teaches_student(');
  out := replace(out, chr(1) || 'IPO' || chr(1), 'private.is_platform_operator()');
  out := replace(out, chr(1) || 'ISA' || chr(1), 'private.is_studio_admin()');

  return out;
end;
$$;

do $$
declare
  pol record;
  new_qual text;
  new_wc text;
  role_clause text;
  create_sql text;
begin
  for pol in
    select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    from pg_policies
    where schemaname in ('public', 'storage')
  loop
    new_qual := private.migrate_policy_expr(pol.qual);
    new_wc := private.migrate_policy_expr(pol.with_check);

    continue when new_qual is not distinct from pol.qual
              and new_wc is not distinct from pol.with_check;

    execute format('drop policy %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);

    if pol.roles is null or array_length(pol.roles, 1) is null then
      role_clause := '';
    else
      role_clause := format(' to %s', array_to_string(pol.roles, ', '));
    end if;

    create_sql := format(
      'create policy %I on %I.%I as %s for %s%s',
      pol.policyname,
      pol.schemaname,
      pol.tablename,
      pol.permissive,
      pol.cmd,
      role_clause
    );

    if new_qual is not null then
      create_sql := create_sql || format(' using (%s)', new_qual);
    end if;

    if new_wc is not null then
      create_sql := create_sql || format(' with check (%s)', new_wc);
    end if;

    execute create_sql;
  end loop;
end;
$$;

drop function private.migrate_policy_expr(text);

-- ─── Drop moved public functions (no longer referenced) ────────────────────

drop function if exists public.guard_profile_privileges();
drop function if exists public.touch_updated_at();
drop function if exists public.handle_new_user();
drop function if exists public.notify_enrollment_confirmed();
drop function if exists public.notify_invoice_overdue();
drop function if exists public.notify_message_received();
drop function if exists public.sync_event_sold_tickets();
drop function if exists public.decrement_stock_on_order();
drop function if exists public.restock_on_order_refund();
drop function if exists public.promote_waitlist();
drop function if exists public.current_studio();
drop function if exists public.current_user_role();
drop function if exists public.is_my_child(uuid);
drop function if exists public.teaches_class(uuid);
drop function if exists public.teaches_student(uuid);
drop function if exists public.is_platform_operator();
drop function if exists public.is_studio_admin();

-- ─── Lock down intentional public RPC / auth hooks ─────────────────────────

revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;

grant execute on function public.create_studio_for_user(text, text) to authenticated;
grant execute on function public.accept_studio_invite(text) to authenticated;
grant execute on function public.register_studio_member(text, public.user_role) to authenticated;

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end;
$$;

-- ─── Storage: public bucket listing (0025) ─────────────────────────────────
-- Public buckets serve files via direct URL; a broad SELECT policy enables
-- listing every object in the bucket via the Storage API.

drop policy if exists "site_images_public_read" on storage.objects;
