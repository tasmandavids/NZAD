"use server";

// ============================================================================
//  Teacher portal server actions
// ============================================================================

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const AttendanceSchema = z.object({
  classId:   z.string().uuid(),
  studentId: z.string().uuid(),
  date:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status:    z.enum(["present", "absent", "late", "excused"]),
});

export type AttendanceResult = { ok: true } | { ok: false; error: string };

export async function markAttendance(input: unknown): Promise<AttendanceResult> {
  const parsed = AttendanceSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { classId, studentId, date, status } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "teacher" && profile?.role !== "admin") {
    return { ok: false, error: "Only teachers and admins can mark attendance." };
  }

  const { data: cls } = await supabase
    .from("classes")
    .select("studio_id, teacher_id")
    .eq("id", classId)
    .single();

  if (!cls) return { ok: false, error: "Class not found." };
  if (cls.teacher_id !== user.id) {
    return { ok: false, error: "You are not assigned to this class." };
  }

  const { error } = await supabase.from("attendance").upsert(
    {
      studio_id:  cls.studio_id,
      class_id:   classId,
      student_id: studentId,
      date,
      status,
      noted_by:   user.id,
    },
    { onConflict: "class_id,student_id,date" },
  );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
