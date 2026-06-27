-- User-controlled portal light/dark preference (overrides studio branding base in the portal shell).
alter table public.profiles
  add column if not exists portal_theme text;

alter table public.profiles
  drop constraint if exists profiles_portal_theme_check;

alter table public.profiles
  add constraint profiles_portal_theme_check
  check (portal_theme is null or portal_theme in ('light', 'dark'));
