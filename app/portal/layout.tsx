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
import { SetupResumeBanner } from "@/components/setup/SetupResumeBanner";
import { getBrandingCached } from "@/lib/branding";
import { fetchStudioSetupState, setupBlocksPortal, setupNeedsBanner } from "@/lib/setup/server";
import type { Role } from "@/lib/types";
import { getTranslations } from "@/lib/i18n/server";

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

  const studio = profile.studios as unknown as { name: string } | null;
  const isAdmin = profile.role === "admin";
  const now = new Date().toISOString();

  const [setupResult, announcementsResult, branding, tCommon] = await Promise.all([
    isAdmin
      ? fetchStudioSetupState(supabase, profile.studio_id)
      : Promise.resolve({ state: null }),
    isAdmin
      ? supabase
          .from("platform_announcements")
          .select("id, title, body, severity, expires_at")
          .not("published_at", "is", null)
          .lte("published_at", now)
          .order("published_at", { ascending: false })
          .limit(10)
      : Promise.resolve({ data: null }),
    getBrandingCached(profile.studio_id),
    getTranslations("common"),
  ]);

  const setupState = setupResult.state;
  if (isAdmin && setupState && setupBlocksPortal(setupState)) {
    redirect("/setup");
  }

  const announcements = (announcementsResult.data ?? [])
    .filter((a) => !a.expires_at || a.expires_at > now)
    .slice(0, 3)
    .map(({ id, title, body, severity }) => ({ id, title, body, severity }));

  return (
    <PortalShell
      role={profile.role as Role}
      studioName={studio?.name ?? tCommon("yourStudio")}
      logoUrl={branding.logoUrl}
      userName={profile.full_name}
    >
      {isAdmin && setupState && setupNeedsBanner(setupState) && (
        <SetupResumeBanner
          setupStep={setupState.setupStep}
          snoozed={!!setupState.setupSnoozedAt}
        />
      )}
      {isAdmin && announcements.length > 0 && (
        <PlatformAnnouncementsBanner announcements={announcements} />
      )}
      {children}
    </PortalShell>
  );
}
