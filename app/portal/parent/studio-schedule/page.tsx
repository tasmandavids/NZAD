// ============================================================================
//  /portal/parent/studio-schedule — Full studio weekly timetable (all classes).
// ============================================================================

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ParentStudioScheduleGrid from "@/components/portal/parent/ParentStudioScheduleGrid";
import type { StudioScheduleClass } from "@/lib/portal/parent-studio-schedule";

export default async function ParentStudioSchedulePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("studio_id, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "parent" || !profile.studio_id) redirect("/portal/parent");

  const { data: rows } = await supabase
    .from("classes")
    .select(`
      id, name, discipline, level, stream, room,
      day_of_week, start_time, end_time, price_cents,
      profiles!teacher_id ( full_name )
    `)
    .eq("studio_id", profile.studio_id)
    .not("day_of_week", "is", null)
    .not("start_time", "is", null)
    .order("day_of_week")
    .order("start_time");

  const classes: StudioScheduleClass[] = (rows ?? []).map((row) => {
    const teacher = row.profiles as unknown as { full_name: string | null } | null;
    return {
      id: row.id as string,
      name: row.name as string,
      discipline: row.discipline as string | null,
      level: row.level as string | null,
      stream: row.stream as string | null,
      room: row.room as string | null,
      dayOfWeek: row.day_of_week as number,
      startTime: (row.start_time as string | null)?.slice(0, 5) ?? null,
      endTime: (row.end_time as string | null)?.slice(0, 5) ?? null,
      priceCents: (row.price_cents as number | null) ?? 0,
      teacherName: teacher?.full_name ?? null,
    };
  });

  return <ParentStudioScheduleGrid classes={classes} />;
}
