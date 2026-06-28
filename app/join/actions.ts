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

  const { studioSlug, path, birthday } = parsed.data;

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

  revalidatePath("/", "layout");
  return { ok: true, studioId: studioId as string };
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
