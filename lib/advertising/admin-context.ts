import { createClient } from "@/lib/supabase/server";

export async function getAdminAdvertisingContext(): Promise<
  | { error: string; userId: null; studioId: null }
  | { error: null; userId: string; studioId: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in.", userId: null, studioId: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("studio_id, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return { error: "Admin only.", userId: null, studioId: null };
  if (!profile.studio_id) return { error: "No studio.", userId: null, studioId: null };

  return { error: null, userId: user.id, studioId: profile.studio_id as string };
}
