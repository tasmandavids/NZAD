-- Revert class_capacity back to a plain view — materialized views require
-- explicit RLS policies which were not added, causing query failures.

drop trigger if exists refresh_capacity_on_enrollment on public.enrollments;
drop trigger if exists refresh_capacity_on_class on public.classes;
drop function if exists private.refresh_class_capacity();
drop materialized view if exists public.class_capacity;

create or replace view public.class_capacity
  with (security_invoker = on)
as
select
  c.id,
  c.studio_id,
  c.name,
  c.teacher_id,
  c.discipline,
  c.level,
  c.day_of_week,
  c.start_time,
  c.end_time,
  c.capacity,
  coalesce(
    count(e.id) filter (where e.status = 'active'),
    0
  )::int as enrolled
from public.classes c
left join public.enrollments e
  on e.class_id = c.id and e.studio_id = c.studio_id
group by c.id;

grant select on public.class_capacity to authenticated;
