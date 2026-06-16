-- ============================================================================
--  0013_recurring_classes.sql   (Phase 2.4)
--  Recurring class support for the weekly-recurring model.
--
--  Design decision:
--    The schema already models a "class" as a weekly-recurring slot
--    (classes.day_of_week + classes.start_time). Rather than introduce a
--    separate class_sessions table (which would require rewiring the capacity
--    view, attendance, enrollments and the schedule builder), recurrence is
--    expressed at the class level: a single "recurring group" is a set of
--    weekly class rows that share a recurring_group_id — e.g. a Mon/Wed/Fri
--    4:00pm Ballet becomes three linked class rows.
--
--  recurring_group_id is NULL for one-off (single-day) classes.
--  Apply after 0002_core_tables_and_rls.sql.
-- ============================================================================

alter table public.classes
  add column if not exists recurring_group_id uuid;

create index if not exists classes_recurring_group_idx
  on public.classes(recurring_group_id);
