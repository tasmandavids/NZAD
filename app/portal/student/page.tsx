// ============================================================================
//  /portal/student — Enrolled-class timetable.
//  Server component: fetches the student's active enrollments + class details.
//  Renders:  ① today's classes (prominent)  ② weekly timetable grid
//            ③ all class cards with teacher + level
// ============================================================================

import { createClient } from "@/lib/supabase/server";
import StudentTimetable from "@/components/portal/student/StudentTimetable";

export type EnrolledClass = {
  enrollmentId: string;
  classId: string;
  name: string;
  discipline: string | null;
  level: string | null;
  dayOfWeek: number;        // 0 = Sunday … 6 = Saturday
  startTime: string | null; // "HH:MM:SS"
  endTime: string | null;
  capacity: number;
  teacherName: string | null;
};

export default async function StudentPortal() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: rows } = await supabase
    .from("enrollments")
    .select(`
      id,
      classes (
        id, name, discipline, level,
        day_of_week, start_time, end_time, capacity,
        profiles!teacher_id ( full_name )
      )
    `)
    .eq("student_id", user!.id)
    .eq("status", "active");

  const classes: EnrolledClass[] = (rows ?? [])
    .map((r) => {
      const c = r.classes as unknown as {
        id: string; name: string; discipline: string | null; level: string | null;
        day_of_week: number; start_time: string | null; end_time: string | null;
        capacity: number;
        profiles: { full_name: string | null } | null;
      } | null;
      if (!c) return null;
      return {
        enrollmentId: r.id,
        classId: c.id,
        name: c.name,
        discipline: c.discipline,
        level: c.level,
        dayOfWeek: c.day_of_week,
        startTime: c.start_time,
        endTime: c.end_time,
        capacity: c.capacity,
        teacherName: c.profiles?.full_name ?? null,
      };
    })
    .filter((c): c is EnrolledClass => c !== null)
    .sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
      return (a.startTime ?? "").localeCompare(b.startTime ?? "");
    });

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user!.id)
    .single();

  const todayDow = new Date().getDay();

  return (
    <StudentTimetable
      classes={classes}
      studentName={profile?.full_name ?? null}
      todayDow={todayDow}
    />
  );
}
