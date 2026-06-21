"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type ChildActionResult = { ok: true; studentId: string } | { ok: false; error: string };

const AddChildSchema = z.object({
  fullName: z.string().min(1, "Name is required").max(120),
  birthday: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
});

export async function addChildToFamily(input: unknown): Promise<ChildActionResult> {
  const parsed = AddChildSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("studio_id, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "parent" || !profile.studio_id) {
    return { ok: false, error: "Parent access required." };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { ok: false, error: "Adding children requires studio configuration. Contact support." };
  }

  const d = parsed.data;
  let studentId: string;

  if (d.email) {
    const { data: inviteData, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(d.email, {
      data: { full_name: d.fullName },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/login`,
    });
    if (inviteErr) return { ok: false, error: inviteErr.message };
    studentId = inviteData.user.id;
  } else {
    const authEmail = `${crypto.randomUUID()}@students.olune.local`;
    const { data: authData, error: authErr } = await admin.auth.admin.createUser({
      email: authEmail,
      email_confirm: true,
      user_metadata: { full_name: d.fullName },
    });
    if (authErr) return { ok: false, error: authErr.message };
    studentId = authData.user.id;
  }

  const { error: profileErr } = await admin.from("profiles").upsert({
    id: studentId,
    studio_id: profile.studio_id,
    role: "student",
    full_name: d.fullName,
    email: d.email || null,
    birthday: d.birthday || null,
    self_managed: false,
  });
  if (profileErr) return { ok: false, error: profileErr.message };

  const { error: linkErr } = await admin.from("guardianships").insert({
    studio_id: profile.studio_id,
    guardian_id: user.id,
    student_id: studentId,
    is_primary: true,
    relationship: "guardian",
  });
  if (linkErr) return { ok: false, error: linkErr.message };

  revalidatePath("/portal/parent");
  return { ok: true, studentId };
}
