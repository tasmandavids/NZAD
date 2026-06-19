"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

const ParentSchema = z.object({
  fullName: z.string().min(1, "Name is required").max(120),
  email: z.string().email("Valid email required").optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
});

export async function addParent(input: unknown): Promise<ActionResult> {
  const parsed = ParentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { error, supabase, studioId } = await getAdminStudio();
  if (error || !studioId) return { ok: false, error: error ?? "Unknown error" };

  const d = parsed.data;

  if (d.email) {
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("studio_id", studioId)
      .eq("email", d.email)
      .eq("role", "parent")
      .maybeSingle();
    if (existing) return { ok: false, error: "A parent with this email already exists." };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return {
      ok: false,
      error: "Adding parents requires SUPABASE_SERVICE_ROLE_KEY in .env.local (Supabase → Settings → API).",
    };
  }

  const authEmail = d.email || `${crypto.randomUUID()}@parents.olune.local`;

  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email: authEmail,
    email_confirm: true,
    user_metadata: { full_name: d.fullName },
  });
  if (authErr) return { ok: false, error: authErr.message };

  const userId = authData.user.id;
  const { error: dbError } = await admin.from("profiles").upsert({
    id: userId,
    studio_id: studioId,
    role: "parent",
    full_name: d.fullName,
    email: d.email || null,
    phone: d.phone || null,
  });

  if (dbError) return { ok: false, error: dbError.message };

  revalidatePath("/portal/admin/parents");
  revalidatePath("/portal/admin/subscriptions");
  return { ok: true };
}
