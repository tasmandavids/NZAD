// ============================================================================
//  /portal/parent/schedule — Weekly calendar for linked children's classes
//  and staff-added schedule entries.
// ============================================================================

import { createClient } from "@/lib/supabase/server";
import ParentScheduleCalendar from "@/components/portal/parent/ParentScheduleCalendar";
import type {
  EnrolledClassSlot,
  ScheduleChild,
  ScheduleEntry,
} from "@/lib/students/schedule-types";
import { getWeekRange } from "@/lib/staff/week";
import { mergeScheduleItems } from "@/lib/students/schedule-utils";

export default async function ParentSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const params = await searchParams;
  const weekStart =
    params.week && /^\d{4}-\d{2}-\d{2}$/.test(params.week)
      ? params.week
      : getWeekRange().weekStart;
  const { weekDates, weekEnd } = getWeekRange(new Date(`${weekStart}T12:00:00`));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: guardianships } = await supabase
    .from("guardianships")
    .select(`
      student_id,
      profiles!student_id (
        full_name,
        enrollments (
          status,
          classes (
            id, name, discipline, level,
            day_of_week, start_time, end_time,
            profiles!teacher_id ( full_name )
          )
        )
      )
    `)
    .eq("guardian_id", user!.id);

  const children: ScheduleChild[] = [];
  const classSlots: EnrolledClassSlot[] = [];
  const studentIds: string[] = [];

  for (const g of guardianships ?? []) {
    const profile = g.profiles as unknown as {
      full_name: string | null;
      enrollments: {
        status: string;
        classes: {
          id: string;
          name: string;
          discipline: string | null;
          level: string | null;
          day_of_week: number;
          start_time: string | null;
          end_time: string | null;
          profiles: { full_name: string | null } | null;
        } | null;
      }[];
    } | null;

    const studentId = g.student_id as string;
    studentIds.push(studentId);
    children.push({
      studentId,
      name: profile?.full_name ?? null,
    });

    for (const enrollment of profile?.enrollments ?? []) {
      if (enrollment.status !== "active" || !enrollment.classes) continue;
      const c = enrollment.classes;
      classSlots.push({
        classId: c.id,
        studentId,
        studentName: profile?.full_name ?? null,
        name: c.name,
        discipline: c.discipline,
        level: c.level,
        dayOfWeek: c.day_of_week,
        startTime: c.start_time?.slice(0, 5) ?? null,
        endTime: c.end_time?.slice(0, 5) ?? null,
        teacherName: c.profiles?.full_name ?? null,
      });
    }
  }

  let entries: ScheduleEntry[] = [];
  if (studentIds.length > 0) {
    const { data: entryRows } = await supabase
      .from("student_schedule_entries")
      .select(
        "id, student_id, title, description, entry_date, start_time, end_time, entry_type, location_name, cancelled_at",
      )
      .in("student_id", studentIds)
      .gte("entry_date", weekStart)
      .lte("entry_date", weekEnd)
      .is("cancelled_at", null)
      .order("entry_date")
      .order("start_time");

    entries = (entryRows ?? []).map((row) => ({
      id: row.id as string,
      studentId: row.student_id as string,
      title: row.title as string,
      description: (row.description as string | null) ?? null,
      entryDate: row.entry_date as string,
      startTime: (row.start_time as string | null)?.slice(0, 5) ?? null,
      endTime: (row.end_time as string | null)?.slice(0, 5) ?? null,
      entryType: row.entry_type as ScheduleEntry["entryType"],
      locationName: (row.location_name as string | null) ?? null,
      cancelledAt: null,
    }));
  }

  const nameByStudent = new Map(children.map((c) => [c.studentId, c.name]));
  const items = mergeScheduleItems(classSlots, entries, weekDates).map((item) =>
    item.kind === "entry"
      ? { ...item, studentName: nameByStudent.get(item.studentId) ?? null }
      : item,
  );

  return (
    <ParentScheduleCalendar linkedChildren={children} items={items} weekStart={weekStart} />
  );
}
