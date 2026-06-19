-- ============================================================================
--  0035_parent_email_archive.sql
--  Independent copy of studio↔parent email threads for parent portal review.
-- ============================================================================

create table if not exists public.parent_email_threads (
  id                    uuid primary key default gen_random_uuid(),
  studio_id             uuid not null references public.studios(id) on delete cascade,
  parent_id             uuid not null references public.profiles(id) on delete cascade,
  source_email_thread_id uuid references public.email_threads(id) on delete set null,
  subject               text,
  snippet               text,
  participant_addresses text[] not null default '{}',
  message_count         int not null default 0,
  last_message_at       timestamptz,
  is_read               boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (parent_id, source_email_thread_id)
);

create index if not exists parent_email_threads_parent_idx
  on public.parent_email_threads(parent_id, last_message_at desc nulls last);
create index if not exists parent_email_threads_studio_idx
  on public.parent_email_threads(studio_id, last_message_at desc nulls last);

create table if not exists public.parent_email_messages (
  id                      uuid primary key default gen_random_uuid(),
  studio_id               uuid not null references public.studios(id) on delete cascade,
  parent_id               uuid not null references public.profiles(id) on delete cascade,
  parent_email_thread_id  uuid not null references public.parent_email_threads(id) on delete cascade,
  source_email_message_id uuid references public.email_messages(id) on delete set null,
  from_address            text,
  from_name               text,
  to_addresses            text[] not null default '{}',
  subject                 text,
  body_text               text,
  body_html               text,
  sent_at                 timestamptz,
  is_outbound             boolean not null default false,
  created_at              timestamptz not null default now(),
  unique (parent_id, source_email_message_id)
);

create index if not exists parent_email_messages_thread_idx
  on public.parent_email_messages(parent_email_thread_id, sent_at asc);
create index if not exists parent_email_messages_parent_idx
  on public.parent_email_messages(parent_id, sent_at desc);

alter table public.parent_email_threads enable row level security;
alter table public.parent_email_messages enable row level security;

drop policy if exists "parent_email_threads_admin" on public.parent_email_threads;
create policy "parent_email_threads_admin" on public.parent_email_threads
  for all
  using (studio_id = public.current_studio() and public.current_user_role() = 'admin')
  with check (studio_id = public.current_studio() and public.current_user_role() = 'admin');

drop policy if exists "parent_email_threads_parent_read" on public.parent_email_threads;
create policy "parent_email_threads_parent_read" on public.parent_email_threads
  for select using (
    studio_id = public.current_studio()
    and parent_id = auth.uid()
  );

drop policy if exists "parent_email_threads_parent_update" on public.parent_email_threads;
create policy "parent_email_threads_parent_update" on public.parent_email_threads
  for update using (
    studio_id = public.current_studio()
    and parent_id = auth.uid()
  )
  with check (
    studio_id = public.current_studio()
    and parent_id = auth.uid()
  );

drop policy if exists "parent_email_messages_admin" on public.parent_email_messages;
create policy "parent_email_messages_admin" on public.parent_email_messages
  for all
  using (studio_id = public.current_studio() and public.current_user_role() = 'admin')
  with check (studio_id = public.current_studio() and public.current_user_role() = 'admin');

drop policy if exists "parent_email_messages_parent_read" on public.parent_email_messages;
create policy "parent_email_messages_parent_read" on public.parent_email_messages
  for select using (
    studio_id = public.current_studio()
    and parent_id = auth.uid()
  );

grant select, insert, update, delete on public.parent_email_threads to authenticated;
grant select, insert, update, delete on public.parent_email_messages to authenticated;
