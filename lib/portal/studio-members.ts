import type { SupabaseClient } from "@supabase/supabase-js";
import type { Role } from "@/lib/types";

/** Profile IDs for users linked to a studio (home profile or active membership). */
export async function listStudioMemberProfileIds(
  supabase: SupabaseClient,
  studioId: string,
  role: Role,
): Promise<string[]> {
  const [{ data: direct }, { data: members }] = await Promise.all([
    supabase.from("profiles").select("id").eq("studio_id", studioId).eq("role", role),
    supabase
      .from("studio_memberships")
      .select("user_id")
      .eq("studio_id", studioId)
      .eq("role", role)
      .eq("status", "active"),
  ]);

  const ids = new Set<string>();
  for (const row of direct ?? []) ids.add(row.id as string);
  for (const row of members ?? []) ids.add(row.user_id as string);
  return [...ids];
}
