// ============================================================================
//  /portal layout — resolves the session and wraps every portal route in the
//  shared PortalShell (sidebar nav + studio identity). Runs server-side on
//  every navigation that lands under /portal/*.
//  Auth + role are also enforced by middleware; this is a presentation layer.
// ============================================================================

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PortalShell } from "@/components/portal/PortalShell";
import type { Role } from "@/lib/types";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, studio_id, studios(name)")
    .eq("id", user.id)
    .single();

  if (!profile?.studio_id) redirect("/onboarding");

  // Supabase's TS inference treats every join as an array; cast through unknown.
  const studio = profile.studios as unknown as { name: string } | null;

  return (
    <PortalShell
      role={profile.role as Role}
      studioName={studio?.name ?? "Your studio"}
      userName={profile.full_name}
    >
      {children}
    </PortalShell>
  );
}
