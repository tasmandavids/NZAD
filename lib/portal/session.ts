import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

export type PortalSession = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  studioId: string;
  role: Role;
};

/** Request-scoped portal auth context shared by layout and pages. */
export const getPortalSession = cache(async (): Promise<PortalSession | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("studio_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.studio_id) return null;

  return {
    supabase,
    userId: user.id,
    studioId: profile.studio_id as string,
    role: profile.role as Role,
  };
});

export async function requirePortalSession(): Promise<PortalSession> {
  const session = await getPortalSession();
  if (!session) throw new Error("Not signed in or no studio.");
  return session;
}
