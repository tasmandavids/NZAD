// ============================================================================
//  /portal/admin/students — Student roster with enrollment management.
//  Server component: fetches all students in the studio + their enrollments,
//  plus all available classes for the enroll-dropdown in the slide-over.
// ============================================================================

import { requirePortalSession } from "@/lib/portal/session";
import { listStudioMemberProfileIds } from "@/lib/portal/studio-members";
import StudentsManager from "@/components/admin/students/StudentsManager";

export type StudentEnrollment = {
  classId: string;
  className: string;
  dayOfWeek: number;
  startTime: string | null;
};

export type StudentRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  createdAt: string;
  enrollments: StudentEnrollment[];
};

export type ClassOption = {
  id: string;
  name: string;
  discipline: string | null;
  dayOfWeek: number;
  startTime: string | null;
  capacity: number;
  enrolled: number;
};

export default async function StudentsPage() {
  const { supabase, studioId } = await requirePortalSession();
  if (!studioId) return <StudentsManager students={[]} allClasses={[]} />;

  const studentIds = await listStudioMemberProfileIds(supabase, studioId, "student");

  const [studentsRes, classesRes] = await Promise.all([
    studentIds.length === 0
      ? Promise.resolve({ data: [] as never[] })
      : supabase
          .from("profiles")
          .select(`
        id, full_name, email, phone, created_at,
        enrollments!student_id (
          class_id, status,
          classes ( id, name, day_of_week, start_time )
        )
      `)
          .in("id", studentIds)
          .eq("role", "student")
          .order("full_name"),

    // Fetch class_capacity for the enrollment dropdown
    supabase
      .from("class_capacity")
      .select("id, name, discipline, day_of_week, start_time, capacity, enrolled")
      .eq("studio_id", studioId ?? "")
      .order("day_of_week")
      .order("start_time"),
  ]);

  const students: StudentRow[] = (studentsRes.data ?? []).map((p) => {
    const enrollments = (
      p.enrollments as unknown as {
        class_id: string;
        status: string;
        classes: { id: string; name: string; day_of_week: number; start_time: string | null } | null;
      }[]
    )
      .filter((e) => e.status === "active" && e.classes)
      .map((e) => ({
        classId:   e.classes!.id,
        className: e.classes!.name,
        dayOfWeek: e.classes!.day_of_week,
        startTime: e.classes!.start_time,
      }));

    return {
      id:        p.id,
      name:      p.full_name,
      email:     p.email,
      phone:     p.phone,
      createdAt: p.created_at,
      enrollments,
    };
  });

  const allClasses: ClassOption[] = (classesRes.data ?? []).map((c) => ({
    id:         c.id as string,
    name:       c.name as string,
    discipline: c.discipline as string | null,
    dayOfWeek:  c.day_of_week as number,
    startTime:  c.start_time as string | null,
    capacity:   Number(c.capacity ?? 0),
    enrolled:   Number(c.enrolled ?? 0),
  }));

  return <StudentsManager students={students} allClasses={allClasses} />;
}
