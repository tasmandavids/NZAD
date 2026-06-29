import { requirePortalSession } from "@/lib/portal/session";
import { AdminAvailabilityView } from "@/components/admin/availability/AdminAvailabilityView";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export type TeacherAvailabilityRow = {
  teacherId: string;
  teacherName: string;
  slots: { day: number; dayName: string; startTime: string; endTime: string; notes: string | null }[];
};

export default async function AdminAvailabilityPage() {
  const { supabase, studioId } = await requirePortalSession();

  // Get all teachers affiliated to this studio
  const { data: affiliations } = await supabase
    .from("studio_memberships")
    .select("instructor_id, profiles!instructor_id ( id, full_name )")
    .eq("studio_id", studioId)
    .eq("status", "active");

  const teacherIds = (affiliations ?? []).map((a) => a.instructor_id as string);

  // Also include staff teachers directly on this studio
  const { data: staffTeachers } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("studio_id", studioId)
    .eq("role", "teacher");

  const allTeacherIds = [
    ...teacherIds,
    ...(staffTeachers ?? []).map((t) => t.id as string),
  ];
  const uniqueIds = [...new Set(allTeacherIds)];

  if (uniqueIds.length === 0) {
    return <AdminAvailabilityView rows={[]} />;
  }

  const { data: slots } = await supabase
    .from("instructor_availability")
    .select("instructor_id, day_of_week, start_time, end_time, notes")
    .in("instructor_id", uniqueIds)
    .order("day_of_week")
    .order("start_time");

  // Build a map of teacher id → name
  const nameMap = new Map<string, string>();
  (affiliations ?? []).forEach((a) => {
    const p = a.profiles as unknown as { id: string; full_name: string | null } | null;
    if (p) nameMap.set(p.id, p.full_name ?? "Teacher");
  });
  (staffTeachers ?? []).forEach((t) => nameMap.set(t.id as string, (t.full_name as string | null) ?? "Teacher"));

  const byTeacher = new Map<string, TeacherAvailabilityRow>();
  for (const slot of slots ?? []) {
    const tid = slot.instructor_id as string;
    if (!byTeacher.has(tid)) {
      byTeacher.set(tid, { teacherId: tid, teacherName: nameMap.get(tid) ?? "Teacher", slots: [] });
    }
    byTeacher.get(tid)!.slots.push({
      day:       slot.day_of_week as number,
      dayName:   DAY_NAMES[slot.day_of_week as number] ?? "",
      startTime: slot.start_time as string,
      endTime:   slot.end_time as string,
      notes:     (slot.notes as string | null) ?? null,
    });
  }

  // Include teachers with no slots
  for (const id of uniqueIds) {
    if (!byTeacher.has(id)) {
      byTeacher.set(id, { teacherId: id, teacherName: nameMap.get(id) ?? "Teacher", slots: [] });
    }
  }

  const rows = [...byTeacher.values()].sort((a, b) => a.teacherName.localeCompare(b.teacherName));

  return <AdminAvailabilityView rows={rows} />;
}
