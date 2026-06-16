// ============================================================================
//  components/site/PublicSite.tsx
//  Server component that assembles a full public page for a studio:
//  branding logo + nav + the page's blocks, wrapped in SiteChrome.
// ============================================================================

import { createClient } from "@/lib/supabase/server";
import { getBranding } from "@/lib/branding";
import { getNavLinks, getSiteClasses, type PublicPage } from "@/lib/site/queries";
import { SiteChrome } from "./SiteChrome";
import { BlockRenderer } from "./BlockRenderer";
import { num } from "@/lib/site/props";

export async function PublicSite({
  studio,
  page,
}: {
  studio: { id: string; name: string };
  page: PublicPage;
}) {
  const supabase = await createClient();

  // How many classes does this page actually need? (max limit across classGrids)
  const classGridLimit = page.blocks
    .filter((b) => b.type === "classGrid")
    .reduce((max, b) => Math.max(max, num(b.props, "limit", 6)), 0);

  const [branding, nav, classes] = await Promise.all([
    getBranding(supabase, studio.id),
    getNavLinks(studio.id),
    classGridLimit > 0 ? getSiteClasses(studio.id, classGridLimit) : Promise.resolve([]),
  ]);

  return (
    <SiteChrome studioName={studio.name} logoUrl={branding.logoUrl} nav={nav}>
      <BlockRenderer blocks={page.blocks} context={{ classes }} />
    </SiteChrome>
  );
}
