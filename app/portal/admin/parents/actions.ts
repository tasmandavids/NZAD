"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { GuardianRelationship } from "@/lib/parents/types";

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

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

const RelationshipSchema = z.enum(["mother", "father", "guardian", "other"]);

const GuardianInputSchema = z.object({
  fullName: z.string().min(1, "Name is required").max(120),
  email: z.string().email("Valid email required").optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
  relationship: RelationshipSchema.default("guardian"),
});

const ParentSchema = GuardianInputSchema;

const AddFamilySchema = z.object({
  primary: GuardianInputSchema,
  coParent: GuardianInputSchema.optional(),
  primaryContactId: z.enum(["primary", "coParent"]).default("primary"),
  childIds: z.array(z.string().uuid()).default([]),
});

const PARENT_PATHS = [
  "/portal/admin/parents",
  "/portal/admin/subscriptions",
  "/portal/admin/billing",
];

function revalidateParentPaths(parentId?: string) {
  for (const path of PARENT_PATHS) revalidatePath(path);
  if (parentId) revalidatePath(`/portal/admin/parents/${parentId}`);
}

async function createParentProfile(
  admin: SupabaseClient,
  studioId: string,
  input: z.infer<typeof GuardianInputSchema>,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (input.email) {
    const { data: existing } = await admin
      .from("profiles")
      .select("id")
      .eq("studio_id", studioId)
      .eq("email", input.email)
      .eq("role", "parent")
      .maybeSingle();
    if (existing) return { ok: false, error: `A parent with email ${input.email} already exists.` };
  }

  const authEmail = input.email || `${crypto.randomUUID()}@parents.olune.local`;

  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email: authEmail,
    email_confirm: true,
    user_metadata: { full_name: input.fullName },
  });
  if (authErr) return { ok: false, error: authErr.message };

  const userId = authData.user.id;
  const { error: dbError } = await admin.from("profiles").upsert({
    id: userId,
    studio_id: studioId,
    role: "parent",
    full_name: input.fullName,
    email: input.email || null,
    phone: input.phone || null,
  });

  if (dbError) return { ok: false, error: dbError.message };
  return { ok: true, id: userId };
}

async function linkGuardianships(
  admin: SupabaseClient,
  studioId: string,
  links: {
    guardianId: string;
    studentId: string;
    relationship: GuardianRelationship;
    isPrimary: boolean;
  }[],
) {
  for (const link of links) {
    const { error } = await admin.from("guardianships").upsert(
      {
        studio_id: studioId,
        guardian_id: link.guardianId,
        student_id: link.studentId,
        relationship: link.relationship,
        is_primary: link.isPrimary,
      },
      { onConflict: "guardian_id,student_id" },
    );
    if (error) return error.message;
  }
  return null;
}

async function clearPrimaryForStudents(
  admin: SupabaseClient,
  studioId: string,
  studentIds: string[],
) {
  if (studentIds.length === 0) return null;
  const { error } = await admin
    .from("guardianships")
    .update({ is_primary: false })
    .eq("studio_id", studioId)
    .in("student_id", studentIds);
  return error?.message ?? null;
}

export async function addParent(input: unknown): Promise<ActionResult> {
  const parsed = ParentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { error, studioId } = await getAdminStudio();
  if (error || !studioId) return { ok: false, error: error ?? "Unknown error" };

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return {
      ok: false,
      error: "Adding parents requires SUPABASE_SERVICE_ROLE_KEY in .env.local (Supabase → Settings → API).",
    };
  }

  const result = await createParentProfile(admin, studioId, parsed.data);
  if (!result.ok) return result;

  revalidateParentPaths();
  return { ok: true, id: result.id };
}

export async function addFamily(input: unknown): Promise<ActionResult> {
  const parsed = AddFamilySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { error, studioId } = await getAdminStudio();
  if (error || !studioId) return { ok: false, error: error ?? "Unknown error" };

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return {
      ok: false,
      error: "Adding families requires SUPABASE_SERVICE_ROLE_KEY in .env.local.",
    };
  }

  const { primary, coParent, primaryContactId, childIds } = parsed.data;

  const primaryResult = await createParentProfile(admin, studioId, primary);
  if (!primaryResult.ok) return primaryResult;

  let coParentId: string | null = null;
  if (coParent) {
    const coResult = await createParentProfile(admin, studioId, coParent);
    if (!coResult.ok) return coResult;
    coParentId = coResult.id;
  }

  const primaryGuardianId =
    primaryContactId === "coParent" && coParentId ? coParentId : primaryResult.id;
  const secondaryGuardianId =
    coParentId && primaryGuardianId === coParentId ? primaryResult.id : coParentId;

  if (childIds.length > 0) {
    const clearErr = await clearPrimaryForStudents(admin, studioId, childIds);
    if (clearErr) return { ok: false, error: clearErr };

    const links: {
      guardianId: string;
      studentId: string;
      relationship: GuardianRelationship;
      isPrimary: boolean;
    }[] = [];

    for (const studentId of childIds) {
      links.push({
        guardianId: primaryResult.id,
        studentId,
        relationship: primary.relationship as GuardianRelationship,
        isPrimary: primaryGuardianId === primaryResult.id,
      });
      if (coParentId && coParent) {
        links.push({
          guardianId: coParentId,
          studentId,
          relationship: coParent.relationship as GuardianRelationship,
          isPrimary: primaryGuardianId === coParentId,
        });
      }
    }

    const linkErr = await linkGuardianships(admin, studioId, links);
    if (linkErr) return { ok: false, error: linkErr };
  }

  revalidateParentPaths(primaryResult.id);
  if (coParentId) revalidateParentPaths(coParentId);
  return { ok: true, id: primaryResult.id };
}

const UpdateParentSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().min(1).max(120),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
});

export async function updateParent(input: unknown): Promise<ActionResult> {
  const parsed = UpdateParentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { error, supabase, studioId } = await getAdminStudio();
  if (error || !studioId) return { ok: false, error: error ?? "Unknown error" };

  const { id, fullName, email, phone } = parsed.data;

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", id)
    .eq("studio_id", studioId)
    .eq("role", "parent")
    .maybeSingle();
  if (!existing) return { ok: false, error: "Parent not found." };

  if (email) {
    const { data: dup } = await supabase
      .from("profiles")
      .select("id")
      .eq("studio_id", studioId)
      .eq("email", email)
      .eq("role", "parent")
      .neq("id", id)
      .maybeSingle();
    if (dup) return { ok: false, error: "Another parent already uses this email." };
  }

  const { error: updateErr } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      email: email || null,
      phone: phone || null,
    })
    .eq("id", id);

  if (updateErr) return { ok: false, error: updateErr.message };

  revalidateParentPaths(id);
  return { ok: true, id };
}

const LinkChildSchema = z.object({
  guardianId: z.string().uuid(),
  studentId: z.string().uuid(),
  relationship: RelationshipSchema.default("guardian"),
  isPrimary: z.boolean().optional(),
});

export async function linkChild(input: unknown): Promise<ActionResult> {
  const parsed = LinkChildSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { error, supabase, studioId } = await getAdminStudio();
  if (error || !studioId) return { ok: false, error: error ?? "Unknown error" };

  const { guardianId, studentId, relationship, isPrimary } = parsed.data;

  const [{ data: guardian }, { data: student }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id")
      .eq("id", guardianId)
      .eq("studio_id", studioId)
      .eq("role", "parent")
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("id")
      .eq("id", studentId)
      .eq("studio_id", studioId)
      .eq("role", "student")
      .maybeSingle(),
  ]);

  if (!guardian) return { ok: false, error: "Parent not found." };
  if (!student) return { ok: false, error: "Student not found." };

  let primary = isPrimary ?? false;
  if (isPrimary === undefined) {
    const { count } = await supabase
      .from("guardianships")
      .select("id", { count: "exact", head: true })
      .eq("student_id", studentId);
    primary = (count ?? 0) === 0;
  }

  if (primary) {
    const clearErr = await clearPrimaryForStudents(supabase, studioId, [studentId]);
    if (clearErr) return { ok: false, error: clearErr };
  }

  const { error: linkErr } = await supabase.from("guardianships").upsert(
    {
      studio_id: studioId,
      guardian_id: guardianId,
      student_id: studentId,
      relationship,
      is_primary: primary,
    },
    { onConflict: "guardian_id,student_id" },
  );

  if (linkErr) return { ok: false, error: linkErr.message };

  revalidateParentPaths(guardianId);
  return { ok: true };
}

const UnlinkChildSchema = z.object({
  guardianId: z.string().uuid(),
  studentId: z.string().uuid(),
});

export async function unlinkChild(input: unknown): Promise<ActionResult> {
  const parsed = UnlinkChildSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { error, supabase, studioId } = await getAdminStudio();
  if (error || !studioId) return { ok: false, error: error ?? "Unknown error" };

  const { guardianId, studentId } = parsed.data;

  const { error: delErr } = await supabase
    .from("guardianships")
    .delete()
    .eq("studio_id", studioId)
    .eq("guardian_id", guardianId)
    .eq("student_id", studentId);

  if (delErr) return { ok: false, error: delErr.message };

  revalidateParentPaths(guardianId);
  return { ok: true };
}

const SetPrimarySchema = z.object({
  guardianId: z.string().uuid(),
});

export async function setPrimaryContact(input: unknown): Promise<ActionResult> {
  const parsed = SetPrimarySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { error, supabase, studioId } = await getAdminStudio();
  if (error || !studioId) return { ok: false, error: error ?? "Unknown error" };

  const { guardianId } = parsed.data;

  const { data: links } = await supabase
    .from("guardianships")
    .select("student_id")
    .eq("studio_id", studioId)
    .eq("guardian_id", guardianId);

  const studentIds = (links ?? []).map((l) => l.student_id as string);
  if (studentIds.length === 0) {
    return { ok: false, error: "Link at least one child before setting primary contact." };
  }

  const clearErr = await clearPrimaryForStudents(supabase, studioId, studentIds);
  if (clearErr) return { ok: false, error: clearErr };

  const { error: updateErr } = await supabase
    .from("guardianships")
    .update({ is_primary: true })
    .eq("studio_id", studioId)
    .eq("guardian_id", guardianId)
    .in("student_id", studentIds);

  if (updateErr) return { ok: false, error: updateErr.message };

  revalidateParentPaths(guardianId);
  return { ok: true };
}

const AddCoParentSchema = z.object({
  existingGuardianId: z.string().uuid(),
  coParent: GuardianInputSchema,
  makePrimary: z.boolean().default(false),
});

export async function addCoParent(input: unknown): Promise<ActionResult> {
  const parsed = AddCoParentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { error, studioId } = await getAdminStudio();
  if (error || !studioId) return { ok: false, error: error ?? "Unknown error" };

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return {
      ok: false,
      error: "Adding co-parents requires SUPABASE_SERVICE_ROLE_KEY in .env.local.",
    };
  }

  const { existingGuardianId, coParent, makePrimary } = parsed.data;

  const { data: existingLinks } = await admin
    .from("guardianships")
    .select("student_id, relationship")
    .eq("studio_id", studioId)
    .eq("guardian_id", existingGuardianId);

  const coResult = await createParentProfile(admin, studioId, coParent);
  if (!coResult.ok) return coResult;

  const studentIds = (existingLinks ?? []).map((l) => l.student_id as string);

  if (studentIds.length > 0) {
    if (makePrimary) {
      const clearErr = await clearPrimaryForStudents(admin, studioId, studentIds);
      if (clearErr) return { ok: false, error: clearErr };
    }

    const links = studentIds.map((studentId) => ({
      guardianId: coResult.id,
      studentId,
      relationship: coParent.relationship as GuardianRelationship,
      isPrimary: makePrimary,
    }));

    const linkErr = await linkGuardianships(admin, studioId, links);
    if (linkErr) return { ok: false, error: linkErr };
  }

  revalidateParentPaths(existingGuardianId);
  revalidateParentPaths(coResult.id);
  return { ok: true, id: coResult.id };
}

const UpdateChildRelationshipSchema = z.object({
  guardianId: z.string().uuid(),
  studentId: z.string().uuid(),
  relationship: RelationshipSchema,
});

export async function updateChildRelationship(input: unknown): Promise<ActionResult> {
  const parsed = UpdateChildRelationshipSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { error, supabase, studioId } = await getAdminStudio();
  if (error || !studioId) return { ok: false, error: error ?? "Unknown error" };

  const { guardianId, studentId, relationship } = parsed.data;

  const { error: updateErr } = await supabase
    .from("guardianships")
    .update({ relationship })
    .eq("studio_id", studioId)
    .eq("guardian_id", guardianId)
    .eq("student_id", studentId);

  if (updateErr) return { ok: false, error: updateErr.message };

  revalidateParentPaths(guardianId);
  return { ok: true };
}
