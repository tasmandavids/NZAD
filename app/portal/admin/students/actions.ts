"use server";

// ============================================================================
//  Admin · Students server actions
//  enroll / unenroll a student, add a new student profile.
// ============================================================================

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioOpsStudio } from "@/lib/portal/access";

async function getAdminStudio() {
  const ctx = await getStudioOpsStudio();
  return {
    error: ctx.error,
    supabase: ctx.supabase,
    studioId: ctx.studioId,
  };
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

  const { error, studioId } = await getAdminStudio();
  if (error || !studioId) return { ok: false, error: error ?? "Unknown error" };

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return {
      ok: false,
      error: "Adding students requires SUPABASE_SERVICE_ROLE_KEY in .env.local (Supabase → Settings → API).",
    };
  }

  const d = parsed.data;
  const authEmail = d.email || `${crypto.randomUUID()}@students.olune.local`;

  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email: authEmail,
    email_confirm: true,
    user_metadata: { full_name: d.fullName },
  });
  if (authErr) return { ok: false, error: authErr.message };

  const userId = authData.user.id;
  const { error: dbError } = await admin.from("profiles").upsert({
    id:        userId,
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
