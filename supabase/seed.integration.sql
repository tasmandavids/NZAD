-- Optional seed for integration tests (run after migrations 0001–0024).
-- Requires at least one auth user linked to an admin profile; adjust UUIDs if reusing.

-- Example: ensure sibling discount column exists (migration 0015)
-- select sibling_discount_pct from studios limit 1;

-- Integration tests create and delete their own rows; no static seed required
-- beyond an existing studio + two student profiles + one parent/admin profile.
