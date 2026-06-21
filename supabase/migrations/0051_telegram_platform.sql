-- ============================================================================
--  0051_telegram_platform.sql
--  Extend social_platform enum for Telegram channel publishing.
-- ============================================================================

do $$ begin
  alter type public.social_platform add value 'telegram';
exception when duplicate_object then null;
end $$;
