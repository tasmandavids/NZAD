-- ============================================================================
--  0041_advertising_seo.sql
--  Social ad connections, campaigns, and SEO audit history.
-- ============================================================================

do $$ begin
  create type public.social_platform as enum ('facebook', 'instagram', 'tiktok');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.ad_campaign_status as enum ('draft', 'scheduled', 'active', 'paused', 'completed', 'failed');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.ad_objective as enum ('awareness', 'traffic', 'engagement', 'conversions', 'leads');
exception when duplicate_object then null;
end $$;

-- ─── Social platform connections ───────────────────────────────────────────

create table if not exists public.social_connections (
  id                    uuid primary key default gen_random_uuid(),
  studio_id             uuid not null references public.studios(id) on delete cascade,
  platform              public.social_platform not null,
  account_id            text,
  account_name          text,
  credentials_encrypted text not null,
  settings              jsonb not null default '{}'::jsonb,
  connected_by          uuid references public.profiles(id) on delete set null,
  last_sync_at          timestamptz,
  sync_error            text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (studio_id, platform)
);

create index if not exists social_connections_studio_idx on public.social_connections(studio_id);

-- ─── Ad campaigns ────────────────────────────────────────────────────────────

create table if not exists public.ad_campaigns (
  id              uuid primary key default gen_random_uuid(),
  studio_id       uuid not null references public.studios(id) on delete cascade,
  name            text not null,
  objective       public.ad_objective not null default 'traffic',
  status          public.ad_campaign_status not null default 'draft',
  platforms       public.social_platform[] not null default '{}',
  headline        text,
  body_text       text,
  call_to_action  text,
  image_url       text,
  video_url       text,
  target_url      text,
  budget_cents    int,
  scheduled_at    timestamptz,
  published_at    timestamptz,
  platform_ids    jsonb not null default '{}'::jsonb,
  publish_error   text,
  ai_generated    boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists ad_campaigns_studio_idx on public.ad_campaigns(studio_id, updated_at desc);

-- ─── SEO audit history ───────────────────────────────────────────────────────

create table if not exists public.seo_audits (
  id              uuid primary key default gen_random_uuid(),
  studio_id       uuid not null references public.studios(id) on delete cascade,
  page_id         uuid references public.site_pages(id) on delete cascade,
  score           int,
  recommendations jsonb not null default '[]'::jsonb,
  ai_summary      text,
  applied_changes jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists seo_audits_studio_idx on public.seo_audits(studio_id, created_at desc);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table public.social_connections enable row level security;
alter table public.ad_campaigns enable row level security;
alter table public.seo_audits enable row level security;

drop policy if exists "social_connections_admin" on public.social_connections;
create policy "social_connections_admin" on public.social_connections
  for all using (
    studio_id = public.current_studio()
    and public.current_user_role() = 'admin'
  );

drop policy if exists "ad_campaigns_admin" on public.ad_campaigns;
create policy "ad_campaigns_admin" on public.ad_campaigns
  for all using (
    studio_id = public.current_studio()
    and public.current_user_role() = 'admin'
  );

drop policy if exists "seo_audits_admin" on public.seo_audits;
create policy "seo_audits_admin" on public.seo_audits
  for all using (
    studio_id = public.current_studio()
    and public.current_user_role() = 'admin'
  );

grant select, insert, update, delete on public.social_connections to authenticated;
grant select, insert, update, delete on public.ad_campaigns to authenticated;
grant select, insert, update, delete on public.seo_audits to authenticated;
