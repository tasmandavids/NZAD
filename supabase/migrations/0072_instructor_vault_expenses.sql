-- ============================================================================
--  0072_instructor_vault_expenses.sql
--  Sole-trader: compliance vault (certs/qualifications) + expense log
-- ============================================================================

-- Compliance vault: certificates, insurance, qualifications
create table if not exists public.instructor_documents (
  id             uuid primary key default gen_random_uuid(),
  instructor_id  uuid not null references public.profiles(id) on delete cascade,
  title          text not null,
  doc_type       text not null default 'other'
                   check (doc_type in ('certificate','qualification','insurance','working_with_children','first_aid','other')),
  issuer         text,
  issued_date    date,
  expiry_date    date,
  file_url       text,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists instructor_docs_instructor_idx on public.instructor_documents(instructor_id, doc_type);

alter table public.instructor_documents enable row level security;

drop policy if exists "instructor_docs_own" on public.instructor_documents;
create policy "instructor_docs_own" on public.instructor_documents
  for all using (instructor_id = auth.uid());

-- Admins at affiliated studios can view qualifications (for safeguarding)
drop policy if exists "instructor_docs_admin_read" on public.instructor_documents;
create policy "instructor_docs_admin_read" on public.instructor_documents
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and p.studio_id in (
          select studio_id from public.studio_memberships
          where user_id = instructor_documents.instructor_id
        )
    )
  );

-- Expense log
create table if not exists public.instructor_expenses (
  id             uuid primary key default gen_random_uuid(),
  instructor_id  uuid not null references public.profiles(id) on delete cascade,
  studio_id      uuid references public.studios(id) on delete set null,
  description    text not null,
  category       text not null default 'other'
                   check (category in ('travel','equipment','uniform','training','software','marketing','insurance','other')),
  amount_cents   int not null check (amount_cents >= 0),
  currency       text not null default 'nzd',
  expense_date   date not null,
  receipt_url    text,
  reimbursable   boolean not null default false,
  reimbursed     boolean not null default false,
  notes          text,
  created_at     timestamptz not null default now()
);

create index if not exists instructor_expenses_instructor_idx on public.instructor_expenses(instructor_id, expense_date);

alter table public.instructor_expenses enable row level security;

drop policy if exists "instructor_expenses_own" on public.instructor_expenses;
create policy "instructor_expenses_own" on public.instructor_expenses
  for all using (instructor_id = auth.uid());

grant select, insert, update, delete on public.instructor_documents to authenticated;
grant select, insert, update, delete on public.instructor_expenses to authenticated;
