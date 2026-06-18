// Edge-safe platform operator check for middleware (no service role).

import type { SupabaseClient } from "@supabase/supabase-js";

function emailAllowlist(): Set<string> {
  const raw = process.env.PLATFORM_OPERATOR_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export async function checkPlatformOperator(
  supabase: SupabaseClient,
  userId: string,
  email?: string | null,
): Promise<boolean> {
  if (email && emailAllowlist().has(email.toLowerCase())) return true;

  const { data } = await supabase
    .from("platform_operators")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  return !!data;
}
