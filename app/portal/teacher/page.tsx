// ============================================================================
//  /portal/teacher — Schedule overview + today's interactive roll call.
//  Server component: fetches the teacher's classes, today's enrolled students,
//  and any attendance already logged for today.
// ============================================================================

import { createClient } from "@/lib/supabase/server";
import TeacherSchedule from "@/components/portal/teacher/TeacherSchedule";

export type TeacherClass = {
  id: string;
  name: string;
  discipline: string | null;
  level: string | null;
  dayOfWeek: number;
  startTime: string | null;
  endTime: string | null;
  capacity: number;
  students: {
    studentId: string;
    name: string | null;
    attendanceStatus: "present" | "absent" | "late" | "excused" | null;
  }[];
};

export default async function TeacherPortal() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  const todayDow = new Date().getDay();

  const [profileRes, classesRes] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user!.id).single(),

    supabase
      .from("classes")
      .select(`
        id, name, discipline, level,
        day_of_week, start_time, end_time, capacity,
        enrollments (
          student_id, status,
          profiles!student_id ( full_name )
        )
      `)
      .eq("teacher_id", user!.id)
      .order("day_of_week")
      .order("start_time"),
  ]);

  // Fetch today's attendance records for all the teacher's classes
  const classIds = (classesRes.data ?? []).map((c) => c.id);
  const { data: attendanceRows } = classIds.length
    ? await supabase
        .from("attendance")
        .select("class_id, student_id, status")
        .in("class_id", classIds)
        .eq("date", today)
    : { data: [] };

  // Build a lookup: `${classId}:${studentId}` → status
  const attLookup = new Map<string, string>(
    (attendanceRows ?? []).map((a) => [`${a.class_id}:${a.student_id}`, a.status]),
  );

  const classes: TeacherClass[] = (classesRes.data ?? []).map((cls) => {
    const students = (cls.enrollments as unknown as {
      student_id: string; status: string;
      profiles: { full_name: string | null } | null;
    }[])
      .filter((e) => e.status === "active")
      .map((e) => ({
        studentId: e.student_id,
        name: e.profiles?.full_name ?? null,
        attendanceStatus:
          (attLookup.get(`${cls.id}:${e.student_id}`) as TeacherClass["students"][0]["attendanceStatus"]) ??
          null,
      }))
      .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));

    return {
      id: cls.id,
      name: cls.name,
      discipline: cls.discipline,
      level: cls.level,
      dayOfWeek: cls.day_of_week,
      startTime: cls.start_time,
      endTime: cls.end_time,
      capacity: cls.capacity,
      students,
    };
  });

  return (
    <TeacherSchedule
      teacherName={profileRes.data?.full_name ?? null}
      classes={classes}
      todayDow={todayDow}
      todayDate={today}
    />
  );
}
