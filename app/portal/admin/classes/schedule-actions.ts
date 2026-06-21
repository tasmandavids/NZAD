"use server";

// ============================================================================
//  Schedule builder server actions
//  Persists drag-and-drop reschedule events for a class.
// ============================================================================

import { revalidatePath } from "next/cache";
import { getAdminStudio } from "@/lib/portal/access";

export type ScheduleResult = { ok: true } | { ok: false; error: string };

/**
 * Persist a drag-and-drop reschedule.
 * Pass dayOfWeek=null and startTime=null to move a class back to "unscheduled".
 */
export async function rescheduleClass(
  classId: string,
  dayOfWeek: number | null,
  startTime: string | null,  // "HH:MM" or null
): Promise<ScheduleResult> {
  const { error, supabase, studioId } = await getAdminStudio();
  if (error || !studioId) return { ok: false, error: error ?? "Unknown error" };

  // Validate the class belongs to this studio
  const { data: cls } = await supabase
    .from("classes")
    .select("id")
    .eq("id", classId)
    .eq("studio_id", studioId)
    .single();

  if (!cls) return { ok: false, error: "Class not found." };

  const { error: updateError } = await supabase
    .from("classes")
    .update({
      day_of_week: dayOfWeek,
      start_time: startTime,
    })
    .eq("id", classId)
    .eq("studio_id", studioId);

  if (updateError) return { ok: false, error: updateError.message };

  revalidatePath("/portal/admin");
  return { ok: true };
}
