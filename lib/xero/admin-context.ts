import { createClient } from "@/lib/supabase/server";

export async function getAdminXeroContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." as const };

  const { data: profile } = await supabase
    .from("profiles")
    .select("studio_id, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return { error: "Admin only." as const };
  if (!profile.studio_id) return { error: "No studio." as const };

  return {
    error: null,
    supabase,
    studioId: profile.studio_id as string,
    userId: user.id,
  };
}
