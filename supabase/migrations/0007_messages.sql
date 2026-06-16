-- ============================================================================
--  0007_messages.sql
--  Internal messaging between studio staff, teachers, parents and students.
-- ============================================================================

create table if not exists public.messages (
  id            uuid primary key default gen_random_uuid(),
  studio_id     uuid not null references public.studios(id) on delete cascade,
  from_user_id  uuid not null references public.profiles(id) on delete cascade,
  to_user_id    uuid not null references public.profiles(id) on delete cascade,
  body          text not null check (char_length(body) between 1 and 4000),
  channel       text not null default 'internal'
                  check (channel in ('internal', 'email', 'sms')),
  sent_at       timestamptz not null default now(),
  read_at       timestamptz
);

create index if not exists messages_studio_idx    on public.messages(studio_id);
create index if not exists messages_to_user_idx   on public.messages(to_user_id, sent_at desc);
create index if not exists messages_from_user_idx on public.messages(from_user_id, sent_at desc);
-- index for conversation threads (between two specific users)
create index if not exists messages_thread_idx
  on public.messages(studio_id, least(from_user_id, to_user_id), greatest(from_user_id, to_user_id), sent_at desc);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table public.messages enable row level security;

-- A user can see messages they sent or received within their studio
drop policy if exists "messages_participant" on public.messages;
create policy "messages_participant" on public.messages
  for select using (
    studio_id = public.current_studio()
    and (from_user_id = auth.uid() or to_user_id = auth.uid())
  );

-- Admins can see all messages in their studio
drop policy if exists "messages_admin_all" on public.messages;
create policy "messages_admin_all" on public.messages
  for all using (
    studio_id = public.current_studio()
    and public.current_user_role() = 'admin'
  );

-- Users can send messages in their studio
drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages
  for insert with check (
    studio_id = public.current_studio()
    and from_user_id = auth.uid()
  );

-- Users can mark their received messages as read
drop policy if exists "messages_mark_read" on public.messages;
create policy "messages_mark_read" on public.messages
  for update using (
    studio_id = public.current_studio()
    and to_user_id = auth.uid()
  );

grant select, insert, update on public.messages to authenticated;
