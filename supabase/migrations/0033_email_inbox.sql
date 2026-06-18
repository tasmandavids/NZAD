-- ============================================================================
--  0033_email_inbox.sql
--  Connected email inboxes — sync real mail from Gmail, Microsoft, iCloud, Mail.ru.
-- ============================================================================

do $$ begin
  create type public.email_provider as enum ('gmail', 'microsoft', 'icloud', 'mailru');
exception when duplicate_object then null;
end $$;

create table if not exists public.email_accounts (
  id                    uuid primary key default gen_random_uuid(),
  studio_id             uuid not null references public.studios(id) on delete cascade,
  provider              public.email_provider not null,
  email_address         text not null,
  display_name          text,
  credentials_encrypted text not null,
  sync_cursor           text,
  last_sync_at          timestamptz,
  sync_error            text,
  connected_by          uuid references public.profiles(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (studio_id, email_address)
);

create index if not exists email_accounts_studio_idx on public.email_accounts(studio_id);

create table if not exists public.email_threads (
  id                  uuid primary key default gen_random_uuid(),
  account_id          uuid not null references public.email_accounts(id) on delete cascade,
  studio_id           uuid not null references public.studios(id) on delete cascade,
  provider_thread_id  text not null,
  subject             text,
  snippet             text,
  participant_addresses text[] not null default '{}',
  message_count       int not null default 0,
  last_message_at     timestamptz,
  is_read             boolean not null default false,
  summary             text,
  summary_updated_at  timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (account_id, provider_thread_id)
);

create index if not exists email_threads_studio_idx on public.email_threads(studio_id, last_message_at desc);
create index if not exists email_threads_account_idx on public.email_threads(account_id, last_message_at desc);

create table if not exists public.email_messages (
  id                  uuid primary key default gen_random_uuid(),
  thread_id           uuid not null references public.email_threads(id) on delete cascade,
  account_id          uuid not null references public.email_accounts(id) on delete cascade,
  studio_id           uuid not null references public.studios(id) on delete cascade,
  provider_message_id text not null,
  from_address        text,
  from_name           text,
  to_addresses        text[] not null default '{}',
  cc_addresses        text[] not null default '{}',
  subject             text,
  body_text           text,
  body_html           text,
  sent_at             timestamptz,
  is_outbound         boolean not null default false,
  in_reply_to         text,
  created_at          timestamptz not null default now(),
  unique (account_id, provider_message_id)
);

create index if not exists email_messages_thread_idx on public.email_messages(thread_id, sent_at asc);
create index if not exists email_messages_studio_idx on public.email_messages(studio_id, sent_at desc);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table public.email_accounts enable row level security;
alter table public.email_threads enable row level security;
alter table public.email_messages enable row level security;

drop policy if exists "email_accounts_admin" on public.email_accounts;
create policy "email_accounts_admin" on public.email_accounts
  for all using (
    studio_id = public.current_studio()
    and public.current_user_role() = 'admin'
  );

drop policy if exists "email_threads_admin" on public.email_threads;
create policy "email_threads_admin" on public.email_threads
  for all using (
    studio_id = public.current_studio()
    and public.current_user_role() = 'admin'
  );

drop policy if exists "email_messages_admin" on public.email_messages;
create policy "email_messages_admin" on public.email_messages
  for all using (
    studio_id = public.current_studio()
    and public.current_user_role() = 'admin'
  );

grant select, insert, update, delete on public.email_accounts to authenticated;
grant select, insert, update, delete on public.email_threads to authenticated;
grant select, insert, update, delete on public.email_messages to authenticated;
