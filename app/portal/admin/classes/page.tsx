// ============================================================================
//  /portal/admin/classes — Class roster + create/edit/delete.
//  Server component: fetches class_capacity view (enrolled counts) +
//  teacher list for the assignment dropdown.
// ============================================================================

import { createClient } from "@/lib/supabase/server";
import ClassesManager from "@/components/admin/classes/ClassesManager";

export type ClassRow = {
  id: string;
  name: string;
  discipline: string | null;
  level: string | null;
  dayOfWeek: number;
  startTime: string | null;
  endTime: string | null;
  capacity: number;
  priceCents: number;
  enrolled: number;
  teacherId: string | null;
  teacherName: string | null;
  recurringGroupId: string | null;
};

export type TeacherOption = {
  id: string;
  name: string | null;
  email: string | null;
};

async function getStudioId(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("studio_id")
    .eq("id", user.id)
    .single();
  return (data?.studio_id as string) ?? null;
}

export default async function ClassesPage() {
  const supabase = await createClient();
  const studioId = await getStudioId(supabase);

  // Use class_capacity view for live enrolled counts
  const [capacityRes, teachersRes] = await Promise.all([
    supabase
      .from("class_capacity")
      .select(
        "id, name, discipline, level, day_of_week, start_time, end_time, capacity, enrolled, teacher_id",
      )
      .eq("studio_id", studioId ?? "")
      .order("day_of_week")
      .order("start_time"),

    supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("studio_id", studioId ?? "")
      .eq("role", "teacher")
      .order("full_name"),
  ]);

  // Fetch teacher names for class rows (join via a separate select)
  const teacherIds = [
    ...new Set(
      (capacityRes.data ?? [])
        .map((c) => c.teacher_id)
        .filter(Boolean) as string[],
    ),
  ];

  const teacherMap = new Map<string, string>();
  if (teacherIds.length) {
    const { data: teacherRows } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", teacherIds);
    (teacherRows ?? []).forEach((t) => {
      if (t.full_name) teacherMap.set(t.id, t.full_name);
    });
  }

  // Fetch price_cents from the base classes table (not exposed in the view)
  const classIds = (capacityRes.data ?? []).map((c) => c.id as string);
  const priceMap = new Map<string, number>();
  const groupMap = new Map<string, string | null>();
  if (classIds.length) {
    const { data: priceRows } = await supabase
      .from("classes")
      .select("id, price_cents, recurring_group_id")
      .in("id", classIds);
    (priceRows ?? []).forEach((r) => {
      priceMap.set(r.id, r.price_cents ?? 0);
      groupMap.set(r.id, (r.recurring_group_id as string | null) ?? null);
    });
  }

  const classes: ClassRow[] = (capacityRes.data ?? []).map((c) => ({
    id:          c.id as string,
    name:        c.name as string,
    discipline:  c.discipline as string | null,
    level:       c.level as string | null,
    dayOfWeek:   c.day_of_week as number,
    startTime:   c.start_time as string | null,
    endTime:     c.end_time as string | null,
    capacity:    Number(c.capacity ?? 0),
    priceCents:  priceMap.get(c.id as string) ?? 0,
    enrolled:    Number(c.enrolled ?? 0),
    teacherId:   c.teacher_id as string | null,
    teacherName: c.teacher_id ? (teacherMap.get(c.teacher_id as string) ?? null) : null,
    recurringGroupId: groupMap.get(c.id as string) ?? null,
  }));

  const teachers: TeacherOption[] = (teachersRes.data ?? []).map((t) => ({
    id:    t.id,
    name:  t.full_name,
    email: t.email,
  }));

  return <ClassesManager classes={classes} teachers={teachers} />;
}
