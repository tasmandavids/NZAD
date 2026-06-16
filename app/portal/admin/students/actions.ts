"use server";

// ============================================================================
//  Admin · Students server actions
//  enroll / unenroll a student, add a new student profile.
// ============================================================================

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function getAdminStudio() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in.", supabase, studioId: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("studio_id, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return { error: "Admin only.", supabase, studioId: null };
  if (!profile.studio_id) return { error: "No studio found.", supabase, studioId: null };

  return { error: null, supabase, studioId: profile.studio_id as string };
}

export type ActionResult = { ok: true } | { ok: false; error: string };

// ─── ENROLL ─────────────────────────────────────────────────────────────────

const EnrollSchema = z.object({
  studentId: z.string().uuid(),
  classId:   z.string().uuid(),
});

export async function enrollStudent(input: unknown): Promise<ActionResult> {
  const parsed = EnrollSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const { error, supabase, studioId } = await getAdminStudio();
  if (error || !studioId) return { ok: false, error: error ?? "Unknown error" };

  const { studentId, classId } = parsed.data;

  // Check capacity
  const { data: cap } = await supabase
    .from("class_capacity")
    .select("enrolled, capacity")
    .eq("id", classId)
    .eq("studio_id", studioId)
    .single();

  if (!cap) return { ok: false, error: "Class not found." };
  if (Number(cap.enrolled) >= Number(cap.capacity)) {
    return { ok: false, error: "Class is full. Student will be placed on waitlist." };
  }

  const { error: dbError } = await supabase.from("enrollments").upsert(
    {
      studio_id:  studioId,
      student_id: studentId,
      class_id:   classId,
      status:     "active",
    },
    { onConflict: "student_id,class_id" },
  );

  if (dbError) return { ok: false, error: dbError.message };

  revalidatePath("/portal/admin/students");
  revalidatePath("/portal/admin/classes");
  return { ok: true };
}

// ─── UNENROLL ────────────────────────────────────────────────────────────────

export async function unenrollStudent(
  studentId: string,
  classId: string,
): Promise<ActionResult> {
  if (!studentId || !classId) return { ok: false, error: "Missing IDs" };

  const { error, supabase, studioId } = await getAdminStudio();
  if (error || !studioId) return { ok: false, error: error ?? "Unknown error" };

  const { error: dbError } = await supabase
    .from("enrollments")
    .delete()
    .eq("student_id", studentId)
    .eq("class_id", classId)
    .eq("studio_id", studioId);

  if (dbError) return { ok: false, error: dbError.message };

  revalidatePath("/portal/admin/students");
  revalidatePath("/portal/admin/classes");
  return { ok: true };
}

// ─── DROP (soft-cancel) ───────────────────────────────────────────────────────
// Sets status='dropped' instead of hard-deleting the row, preserving history.
// The 0012 waitlist trigger fires on this status change (active → dropped) and
// auto-promotes the next waitlisted student. Re-enrolling later goes through
// enrollStudent's upsert (the (student_id, class_id) unique constraint blocks a
// plain re-insert of the dropped row).

export async function dropEnrollment(
  studentId: string,
  classId: string,
): Promise<ActionResult> {
  if (!studentId || !classId) return { ok: false, error: "Missing IDs" };

  const { error, supabase, studioId } = await getAdminStudio();
  if (error || !studioId) return { ok: false, error: error ?? "Unknown error" };

  const { error: dbError } = await supabase
    .from("enrollments")
    .update({ status: "dropped" })
    .eq("student_id", studentId)
    .eq("class_id", classId)
    .eq("studio_id", studioId);

  if (dbError) return { ok: false, error: dbError.message };

  revalidatePath("/portal/admin/students");
  revalidatePath("/portal/admin/classes");
  return { ok: true };
}

// ─── INVITE / CREATE STUDENT ────────────────────────────────────────────────
// Creates a profile row for a student who doesn't have a login yet.
// In a real flow you'd send a magic-link invite; here we just insert the row.

const StudentSchema = z.object({
  fullName: z.string().min(1, "Name is required").max(120),
  email:    z.string().email("Valid email required").optional().or(z.literal("")),
  phone:    z.string().max(30).optional().or(z.literal("")),
});

export async function addStudent(input: unknown): Promise<ActionResult> {
  const parsed = StudentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { error, supabase, studioId } = await getAdminStudio();
  if (error || !studioId) return { ok: false, error: error ?? "Unknown error" };

  // Supabase Auth is the identity source; for admin-added students we create an
  // auth user via the admin API (requires service-role key). In this starter we
  // insert a profile stub with a generated UUID and no auth.users link so the
  // admin can manage their roster before the student logs in.
  // NOTE: studio admins cannot call supabase.auth.admin.* from the client SDK.
  // A real implementation would use a Supabase Edge Function.
  // For now, we generate a profile row to satisfy the admin roster.
  const newId = crypto.randomUUID();

  const d = parsed.data;
  const { error: dbError } = await supabase.from("profiles").insert({
    id:        newId,
    studio_id: studioId,
    role:      "student",
    full_name: d.fullName,
    email:     d.email || null,
    phone:     d.phone || null,
  });

  if (dbError) return { ok: false, error: dbError.message };

  revalidatePath("/portal/admin/students");
  return { ok: true };
}
