"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdult } from "@/lib/join/age";
import type { Role } from "@/lib/types";

export type JoinActionResult = { ok: true; studioId: string } | { ok: false; error: string };

const CompleteRegistrationSchema = z.object({
  studioSlug: z.string().min(1),
  path: z.enum(["parent", "adult_student"]),
  birthday: z.string().optional(),
  childName: z.string().max(120).optional(),
  childBirthday: z.string().optional(),
});

export async function completeStudioRegistration(
  input: unknown,
): Promise<JoinActionResult> {
  const parsed = CompleteRegistrationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { studioSlug, path, birthday, childName, childBirthday } = parsed.data;

  if (path === "adult_student") {
    if (!birthday || !isAdult(birthday)) {
      return { ok: false, error: "You must be 18 or older to register as an adult student." };
    }
  }

  const role: Role = path === "parent" ? "parent" : "student";
  const selfManaged = path === "adult_student";

  const { data: studioId, error: rpcErr } = await supabase.rpc("register_studio_member", {
    p_studio_slug: studioSlug,
    p_role: role,
    p_self_managed: selfManaged,
    p_birthday: birthday ?? null,
  });

  if (rpcErr) return { ok: false, error: rpcErr.message };

  if (path === "parent" && childName?.trim()) {
    const childRes = await addChildDuringRegistration({
      fullName: childName.trim(),
      birthday: childBirthday,
    });
    if (!childRes.ok) return childRes;
  }

  revalidatePath("/", "layout");
  return { ok: true, studioId: studioId as string };
}

const AddChildSchema = z.object({
  fullName: z.string().min(1).max(120),
  birthday: z.string().optional(),
});

async function addChildDuringRegistration(input: z.infer<typeof AddChildSchema>): Promise<JoinActionResult> {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { ok: false, error: "Child profile could not be created — contact the studio." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("studio_id, active_studio_id, role")
    .eq("id", user.id)
    .single();

  const studioId = (profile?.active_studio_id as string | null) ?? profile?.studio_id;
  if (profile?.role !== "parent" || !studioId) {
    return { ok: false, error: "Parent account required." };
  }

  const authEmail = `${crypto.randomUUID()}@students.olune.local`;
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email: authEmail,
    email_confirm: true,
    user_metadata: { full_name: input.fullName },
  });
  if (authErr) return { ok: false, error: authErr.message };

  const studentId = authData.user.id;
  const { error: profileErr } = await admin.from("profiles").upsert({
    id: studentId,
    studio_id: studioId,
    role: "student",
    full_name: input.fullName,
    birthday: input.birthday ?? null,
    self_managed: false,
  });
  if (profileErr) return { ok: false, error: profileErr.message };

  const { error: linkErr } = await admin.from("guardianships").insert({
    studio_id: studioId,
    guardian_id: user.id,
    student_id: studentId,
    is_primary: true,
    relationship: "guardian",
  });
  if (linkErr) return { ok: false, error: linkErr.message };

  return { ok: true, studioId };
}

export async function getStudioRegistrationInfo(studioSlug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("studios")
    .select("id, name, slug, registration_enabled, registration_roles")
    .eq("slug", studioSlug.toLowerCase())
    .neq("status", "suspended")
    .maybeSingle();

  return data;
}
