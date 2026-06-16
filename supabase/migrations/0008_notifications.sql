-- ============================================================================
--  0008_notifications.sql
--  In-app notification queue with DB triggers for key events.
--  Types: enrollment_confirmed | class_reminder | payment_failed |
--         birthday_greeting | invoice_overdue | message_received
-- ============================================================================

create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  studio_id   uuid not null references public.studios(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  type        text not null,
  title       text not null,
  body        text,
  link        text,           -- relative URL to navigate to on click
  payload     jsonb,          -- extra structured data
  sent_at     timestamptz not null default now(),
  read_at     timestamptz
);

create index if not exists notifications_user_unread_idx
  on public.notifications(user_id, read_at, sent_at desc);

create index if not exists notifications_studio_idx
  on public.notifications(studio_id, sent_at desc);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table public.notifications enable row level security;

drop policy if exists "notifications_own" on public.notifications;
create policy "notifications_own" on public.notifications
  for all using (user_id = auth.uid());

drop policy if exists "notifications_admin_all" on public.notifications;
create policy "notifications_admin_all" on public.notifications
  for all using (
    studio_id = public.current_studio()
    and public.current_user_role() = 'admin'
  );

grant select, insert, update on public.notifications to authenticated;

-- ─── Trigger: enrollment confirmed ───────────────────────────────────────────

create or replace function public.notify_enrollment_confirmed()
returns trigger language plpgsql security definer as $$
declare
  v_class_name  text;
  v_studio_id   uuid;
  v_user_id     uuid;
begin
  -- NEW.user_id is the enrolled student/parent
  select p.studio_id into v_studio_id
    from public.profiles p where p.id = new.user_id;

  select c.name into v_class_name
    from public.classes c where c.id = new.class_id;

  v_user_id := new.user_id;

  insert into public.notifications(studio_id, user_id, type, title, body, link)
  values (
    v_studio_id,
    v_user_id,
    'enrollment_confirmed',
    'Enrolled in ' || coalesce(v_class_name, 'class'),
    'You have been successfully enrolled. See you there!',
    '/portal/student'
  );

  return new;
end;
$$;

drop trigger if exists enrollment_notify_trigger on public.enrollments;
create trigger enrollment_notify_trigger
  after insert on public.enrollments
  for each row
  when (new.status = 'enrolled')
  execute function public.notify_enrollment_confirmed();

-- ─── Trigger: invoice overdue ────────────────────────────────────────────────

create or replace function public.notify_invoice_overdue()
returns trigger language plpgsql security definer as $$
begin
  if old.status <> 'overdue' and new.status = 'overdue' then
    insert into public.notifications(studio_id, user_id, type, title, body, link, payload)
    values (
      new.studio_id,
      new.user_id,
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

drop trigger if exists invoice_overdue_notify_trigger on public.invoices;
create trigger invoice_overdue_notify_trigger
  after update of status on public.invoices
  for each row
  execute function public.notify_invoice_overdue();

-- ─── Trigger: message received ────────────────────────────────────────────────

create or replace function public.notify_message_received()
returns trigger language plpgsql security definer as $$
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

drop trigger if exists message_received_notify_trigger on public.messages;
create trigger message_received_notify_trigger
  after insert on public.messages
  for each row
  execute function public.notify_message_received();
