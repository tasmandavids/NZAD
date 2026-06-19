-- Persist user language preference across devices and sessions.
alter table public.profiles
  add column if not exists preferred_locale text;

alter table public.profiles
  drop constraint if exists profiles_preferred_locale_check;

alter table public.profiles
  add constraint profiles_preferred_locale_check
  check (preferred_locale is null or preferred_locale in ('en', 'fr', 'it', 'ru'));
