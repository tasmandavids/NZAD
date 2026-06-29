"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function reportAbsence(data: {
  studentId: string;
  classId: string;
  absenceDate: string;
  reason: string;
  notes: string;
  requestMakeup: boolean;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("studio_id")
    .eq("id", user.id)
    .single();

  if (!profile?.studio_id) throw new Error("No studio");

  const { error } = await supabase.from("student_absences").insert({
    student_id: data.studentId,
    class_id: data.classId,
    absence_date: data.absenceDate,
    reason: data.reason,
    notes: data.notes || null,
    reported_by: user.id,
    makeup_status: data.requestMakeup ? "requested" : "not_requested",
    studio_id: profile.studio_id,
  });

  if (error) throw error;
  revalidatePath("/portal/parent/absences");
}

export async function requestMakeup(absenceId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("student_absences")
    .update({ makeup_status: "requested" })
    .eq("id", absenceId)
    .eq("reported_by", user.id);

  if (error) throw error;
  revalidatePath("/portal/parent/absences");
}
