// ============================================================================
//  /portal layout — resolves the session and wraps every portal route in the
//  shared PortalShell (sidebar nav + studio identity). Runs server-side on
//  every navigation that lands under /portal/*.
//  Auth + role are also enforced by middleware; this is a presentation layer.
// ============================================================================

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PortalShell } from "@/components/portal/PortalShell";
import { PlatformAnnouncementsBanner } from "@/components/admin/PlatformAnnouncementsBanner";
import { getBranding } from "@/lib/branding";
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

  const now = new Date().toISOString();
  const { data: announcementRows } =
    profile.role === "admin"
      ? await supabase
          .from("platform_announcements")
          .select("id, title, body, severity, expires_at")
          .not("published_at", "is", null)
          .lte("published_at", now)
          .order("published_at", { ascending: false })
          .limit(10)
      : { data: null };

  const announcements = (announcementRows ?? [])
    .filter((a) => !a.expires_at || a.expires_at > now)
    .slice(0, 3)
    .map(({ id, title, body, severity }) => ({ id, title, body, severity }));

  const branding = await getBranding(supabase, profile.studio_id);

  return (
    <PortalShell
      role={profile.role as Role}
      studioName={studio?.name ?? "Your studio"}
      logoUrl={branding.logoUrl}
      userName={profile.full_name}
    >
      {profile.role === "admin" && announcements.length > 0 && (
        <PlatformAnnouncementsBanner announcements={announcements} />
      )}
      {children}
    </PortalShell>
  );
}
