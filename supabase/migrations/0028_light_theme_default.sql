-- ============================================================================
--  Olune · migration 0028_light_theme_default
--  Platform-wide light theme: ivory base, white surfaces, black type.
-- ============================================================================

alter table public.studio_branding
  alter column base set default 'light';

update public.studio_branding
  set base = 'light'
  where base = 'dark';
