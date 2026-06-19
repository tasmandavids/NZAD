-- Postgres requires new enum values to be committed before use in the same migration chain.
alter type public.user_role add value if not exists 'office';
