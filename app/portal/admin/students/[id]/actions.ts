"use server";

// ============================================================================
//  Student progress server actions — shared by admin and teacher roles.
//  RLS (0011_student_progress.sql) enforces who may write: admins for any
//  studio student, teachers only for students they teach. We always stamp
//  instructor_id = auth.uid() and studio_id so both policies are satisfiable.
// ============================================================================

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ProgressResult = { ok: true } | { ok: false; error: string };

const LogSchema = z.object({
  studentId: z.string().uuid(),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  level: z.string().trim().max(120).optional().or(z.literal("")),
  certifications: z.array(z.string().trim().max(120)).max(50).default([]),
});

async function getActor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in.", supabase, user: null, studioId: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("studio_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.studio_id) return { error: "No studio found.", supabase, user, studioId: null };
  if (profile.role !== "admin" && profile.role !== "teacher") {
    return { error: "Not permitted.", supabase, user, studioId: null };
  }
  return { error: null, supabase, user, studioId: profile.studio_id as string };
}

export async function logProgress(input: unknown): Promise<ProgressResult> {
  const parsed = LogSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const { notes, level, certifications } = parsed.data;
  if (!notes && !level && certifications.length === 0) {
    return { ok: false, error: "Add a note, level, or certification." };
  }

  const { error, supabase, user, studioId } = await getActor();
  if (error || !user || !studioId) return { ok: false, error: error ?? "Unknown error." };

  const { error: insErr } = await supabase.from("student_progress").insert({
    studio_id: studioId,
    student_id: parsed.data.studentId,
    instructor_id: user.id,
    notes: notes || null,
    level: level || null,
    certifications,
  });

  if (insErr) return { ok: false, error: insErr.message };

  revalidatePath(`/portal/admin/students/${parsed.data.studentId}`);
  revalidatePath("/portal/teacher");
  return { ok: true };
}

export async function deleteProgress(entryId: string, studentId: string): Promise<ProgressResult> {
  if (!z.string().uuid().safeParse(entryId).success) {
    return { ok: false, error: "Invalid entry." };
  }
  const { error, supabase, user } = await getActor();
  if (error || !user) return { ok: false, error: error ?? "Unknown error." };

  const { error: delErr } = await supabase
    .from("student_progress")
    .delete()
    .eq("id", entryId);

  if (delErr) return { ok: false, error: delErr.message };

  revalidatePath(`/portal/admin/students/${studentId}`);
  return { ok: true };
}
