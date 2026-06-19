// ============================================================================
//  /portal/admin/site — Website page manager.
//  Lists the studio's website pages; create / publish / set-home / delete from
//  here, and open a page to edit its blocks.
// ============================================================================

import { createClient } from "@/lib/supabase/server";
import { getBrandingCached } from "@/lib/branding";
import SiteManager, { type SitePageRow } from "@/components/admin/site/SiteManager";
import { WebsiteSetupWizard } from "@/components/admin/site/WebsiteSetupWizard";
import { PublicSiteUrlBanner } from "@/components/admin/site/PublicSiteUrlBanner";

export default async function SitePagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("studio_id")
    .eq("id", user!.id)
    .single();

  const [studioRes, branding, pagesRes] = profile?.studio_id
    ? await Promise.all([
        supabase.from("studios").select("name").eq("id", profile.studio_id).single(),
        getBrandingCached(profile.studio_id),
        supabase
          .from("site_pages")
          .select("id, title, slug, status, is_home, show_in_nav, nav_order, updated_at")
          .eq("studio_id", profile.studio_id)
          .order("is_home", { ascending: false })
          .order("nav_order", { ascending: true })
          .order("created_at", { ascending: true }),
      ])
    : [ { data: null }, null, { data: null } ];

  const studio = studioRes.data;
  const pages = pagesRes.data ?? [];

  const rows: SitePageRow[] = pages.map((p) => ({
    id: p.id as string,
    title: p.title as string,
    slug: p.slug as string,
    status: p.status as "draft" | "published",
    isHome: p.is_home as boolean,
    showInNav: p.show_in_nav as boolean,
    navOrder: p.nav_order as number,
    updatedAt: p.updated_at as string,
  }));

  if (rows.length === 0 && studio?.name) {
    return (
      <div className="space-y-4">
        <PublicSiteUrlBanner />
        <WebsiteSetupWizard
          studioName={studio.name as string}
          initialBranding={{
            tagline: branding?.tagline ?? null,
            logoUrl: branding?.logoUrl ?? null,
            brandColor: branding?.brandColor ?? "#6B66C9",
            base: branding?.base ?? "light",
            fontDisplay: branding?.fontDisplay ?? "Fraunces",
            fontBody: branding?.fontBody ?? "Hanken Grotesk",
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PublicSiteUrlBanner />
      <SiteManager pages={rows} />
    </div>
  );
}
