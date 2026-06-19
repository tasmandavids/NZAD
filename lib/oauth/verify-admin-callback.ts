import type { SupabaseClient, User } from "@supabase/supabase-js";

type OAuthStatePayload = { userId: string; studioId: string };

/** Re-verify admin role and studio membership before persisting OAuth tokens. */
export async function verifyAdminOAuthCallback(
  supabase: SupabaseClient,
  user: User,
  payload: OAuthStatePayload,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (user.id !== payload.userId) {
    return { ok: false, reason: "Session mismatch" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("studio_id, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return { ok: false, reason: "Admin access required" };
  }
  if (profile.studio_id !== payload.studioId) {
    return { ok: false, reason: "Studio mismatch" };
  }

  return { ok: true };
}
