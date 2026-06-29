-- ============================================================================
--  0078_parent_portal_enhancements.sql
--  Parent portal features: absences/makeups, costumes/recital hub,
--  parent notifications, and student forms/permissions vault.
-- ============================================================================

-- ─── Recital info extensions on events ──────────────────────────────────────
alter table public.events
  add column if not exists photo_day_date       date,
  add column if not exists running_order_notes  text,
  add column if not exists info_pack_url        text;

-- ─── Absence records ─────────────────────────────────────────────────────────
create table if not exists public.student_absences (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references public.profiles(id) on delete cascade,
  class_id        uuid not null references public.classes(id) on delete cascade,
  absence_date    date not null,
  reason          text not null default 'other'
                    check (reason in ('sick','holiday','other')),
  notes           text,
  reported_by     uuid not null references public.profiles(id) on delete cascade,
  makeup_status   text not null default 'not_requested'
                    check (makeup_status in ('not_requested','requested','approved','booked','completed','cancelled')),
  makeup_class_id uuid references public.classes(id) on delete set null,
  makeup_date     date,
  studio_id       uuid not null references public.studios(id) on delete cascade,
  created_at      timestamptz not null default now()
);

create index if not exists student_absences_student_idx on public.student_absences(student_id, absence_date desc);
create index if not exists student_absences_studio_idx  on public.student_absences(studio_id, absence_date desc);

alter table public.student_absences enable row level security;

drop policy if exists "absences_parent_rw"  on public.student_absences;
create policy "absences_parent_rw" on public.student_absences
  for all using (
    reported_by = auth.uid()
    or exists (
      select 1 from public.guardianships g
      where g.student_id = student_absences.student_id
        and g.guardian_id = auth.uid()
    )
  );

drop policy if exists "absences_studio_admin" on public.student_absences;
create policy "absences_studio_admin" on public.student_absences
  for all using (
    studio_id = private.current_studio()
    and private.current_user_role() = 'admin'
  );

-- ─── Makeup credits ──────────────────────────────────────────────────────────
create table if not exists public.makeup_credits (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.profiles(id) on delete cascade,
  absence_id  uuid references public.student_absences(id) on delete set null,
  credits     integer not null default 1 check (credits > 0),
  used        integer not null default 0 check (used >= 0),
  expires_at  date,
  studio_id   uuid not null references public.studios(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create index if not exists makeup_credits_student_idx on public.makeup_credits(student_id);

alter table public.makeup_credits enable row level security;

drop policy if exists "makeup_credits_parent" on public.makeup_credits;
create policy "makeup_credits_parent" on public.makeup_credits
  for select using (
    exists (
      select 1 from public.guardianships g
      where g.student_id = makeup_credits.student_id
        and g.guardian_id = auth.uid()
    )
  );

drop policy if exists "makeup_credits_studio" on public.makeup_credits;
create policy "makeup_credits_studio" on public.makeup_credits
  for all using (
    studio_id = private.current_studio()
    and private.current_user_role() = 'admin'
  );

-- ─── Student costumes ────────────────────────────────────────────────────────
create table if not exists public.student_costumes (
  id               uuid primary key default gen_random_uuid(),
  student_id       uuid not null references public.profiles(id) on delete cascade,
  event_id         uuid references public.events(id) on delete cascade,
  class_id         uuid references public.classes(id) on delete set null,
  costume_name     text not null,
  size_label       text,          -- e.g. "Child 10", "Adult S", "Custom"
  size_notes       text,
  colour           text,
  status           text not null default 'pending_size'
                     check (status in ('pending_size','size_confirmed','ordered','received','fitted','ready')),
  price_cents      integer,
  paid             boolean not null default false,
  fitting_date     date,
  return_required  boolean not null default false,
  notes            text,
  studio_id        uuid not null references public.studios(id) on delete cascade,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists student_costumes_student_idx on public.student_costumes(student_id);
create index if not exists student_costumes_event_idx   on public.student_costumes(event_id);
create index if not exists student_costumes_studio_idx  on public.student_costumes(studio_id);

alter table public.student_costumes enable row level security;

drop policy if exists "costumes_parent_read" on public.student_costumes;
create policy "costumes_parent_read" on public.student_costumes
  for select using (
    exists (
      select 1 from public.guardianships g
      where g.student_id = student_costumes.student_id
        and g.guardian_id = auth.uid()
    )
  );

drop policy if exists "costumes_parent_update_size" on public.student_costumes;
create policy "costumes_parent_update_size" on public.student_costumes
  for update using (
    exists (
      select 1 from public.guardianships g
      where g.student_id = student_costumes.student_id
        and g.guardian_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.guardianships g
      where g.student_id = student_costumes.student_id
        and g.guardian_id = auth.uid()
    )
  );

drop policy if exists "costumes_studio_admin" on public.student_costumes;
create policy "costumes_studio_admin" on public.student_costumes
  for all using (
    studio_id = private.current_studio()
    and private.current_user_role() = 'admin'
  );

-- ─── Parent notifications ────────────────────────────────────────────────────
create table if not exists public.parent_notifications (
  id          uuid primary key default gen_random_uuid(),
  parent_id   uuid not null references public.profiles(id) on delete cascade,
  studio_id   uuid not null references public.studios(id) on delete cascade,
  type        text not null
                check (type in (
                  'invoice_due','invoice_overdue','payment_received',
                  'class_change','class_cancelled','class_reminder',
                  'costume_action','costume_fitted',
                  'teacher_note','certificate_awarded',
                  'event_ticket','event_reminder',
                  'makeup_approved','makeup_reminder',
                  'form_required','form_received',
                  'general'
                )),
  title       text not null,
  body        text,
  action_url  text,
  entity_id   uuid,       -- invoice_id / class_id / event_id etc.
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists parent_notifications_parent_idx
  on public.parent_notifications(parent_id, created_at desc);
create index if not exists parent_notifications_unread_idx
  on public.parent_notifications(parent_id, read_at)
  where read_at is null;

alter table public.parent_notifications enable row level security;

drop policy if exists "notifications_parent_rw" on public.parent_notifications;
create policy "notifications_parent_rw" on public.parent_notifications
  for all using (parent_id = auth.uid());

drop policy if exists "notifications_studio_insert" on public.parent_notifications;
create policy "notifications_studio_insert" on public.parent_notifications
  for insert with check (
    studio_id = private.current_studio()
    and private.current_user_role() = 'admin'
  );

-- ─── Student forms & permissions ─────────────────────────────────────────────
create table if not exists public.student_forms (
  id           uuid primary key default gen_random_uuid(),
  studio_id    uuid not null references public.studios(id) on delete cascade,
  title        text not null,
  description  text,
  form_type    text not null default 'general'
                 check (form_type in (
                   'medical','emergency_contact','photo_consent',
                   'video_consent','waiver','pickup_permission',
                   'general'
                 )),
  fields       jsonb not null default '[]',  -- array of {key,label,type,required}
  is_required  boolean not null default true,
  due_date     date,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

create index if not exists student_forms_studio_idx on public.student_forms(studio_id, active);

alter table public.student_forms enable row level security;

drop policy if exists "forms_studio_admin" on public.student_forms;
create policy "forms_studio_admin" on public.student_forms
  for all using (
    studio_id = private.current_studio()
    and private.current_user_role() = 'admin'
  );

drop policy if exists "forms_parent_read" on public.student_forms;
create policy "forms_parent_read" on public.student_forms
  for select using (active = true);

-- ─── Form responses (one per student per form) ───────────────────────────────
create table if not exists public.form_responses (
  id          uuid primary key default gen_random_uuid(),
  form_id     uuid not null references public.student_forms(id) on delete cascade,
  student_id  uuid not null references public.profiles(id) on delete cascade,
  parent_id   uuid not null references public.profiles(id) on delete cascade,
  studio_id   uuid not null references public.studios(id) on delete cascade,
  data        jsonb not null default '{}',   -- {key: value}
  signed_at   timestamptz,
  signature   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (form_id, student_id)
);

create index if not exists form_responses_student_idx on public.form_responses(student_id);
create index if not exists form_responses_form_idx    on public.form_responses(form_id);
create index if not exists form_responses_studio_idx  on public.form_responses(studio_id);

alter table public.form_responses enable row level security;

drop policy if exists "form_responses_parent_rw" on public.form_responses;
create policy "form_responses_parent_rw" on public.form_responses
  for all using (parent_id = auth.uid());

drop policy if exists "form_responses_studio" on public.form_responses;
create policy "form_responses_studio" on public.form_responses
  for all using (
    studio_id = private.current_studio()
    and private.current_user_role() = 'admin'
  );
