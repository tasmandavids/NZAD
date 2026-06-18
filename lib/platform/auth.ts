"use server";

// Platform operator authentication — env allowlist + platform_operators table.

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type PlatformAuthResult =
  | { ok: true; userId: string; email: string | null; name: string | null }
  | { ok: false; error: string };

function emailAllowlist(): Set<string> {
  const raw = process.env.PLATFORM_OPERATOR_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export async function isPlatformOperator(userId: string, email?: string | null): Promise<boolean> {
  if (email && emailAllowlist().has(email.toLowerCase())) return true;

  const admin = createAdminClient();
  const { data } = await admin
    .from("platform_operators")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  return !!data;
}

/** Guard for platform server actions and pages. */
export async function requirePlatformOperator(): Promise<PlatformAuthResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Not signed in." };

  const allowed = await isPlatformOperator(user.id, user.email);
  if (!allowed) return { ok: false, error: "Platform operator access required." };

  const { data: op } = await supabase
    .from("platform_operators")
    .select("full_name")
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    ok: true,
    userId: user.id,
    email: user.email ?? null,
    name: op?.full_name ?? user.user_metadata?.full_name ?? null,
  };
}
