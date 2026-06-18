// ============================================================================
//  components/site/PublicSite.tsx
//  Server component that assembles a full public page for a studio.
// ============================================================================

import { createClient } from "@/lib/supabase/server";
import { getBranding } from "@/lib/branding";
import {
  getNavLinks,
  getSiteClasses,
  getSiteScheduleClasses,
  getSiteEvents,
  getSiteProducts,
  getSiteStaff,
  pageDataNeeds,
  type PublicPage,
} from "@/lib/site/queries";
import { EMPTY_RENDER_CONTEXT } from "@/lib/site/render-context";
import { SiteChrome } from "./SiteChrome";
import { BlockRenderer } from "./BlockRenderer";

export async function PublicSite({
  studio,
  page,
}: {
  studio: { id: string; name: string };
  page: PublicPage;
}) {
  const supabase = await createClient();
  const needs = pageDataNeeds(page.blocks);

  const [branding, nav, classes, scheduleClasses, events, products, staff] = await Promise.all([
    getBranding(supabase, studio.id),
    getNavLinks(studio.id),
    needs.classLimit > 0
      ? getSiteClasses(studio.id, needs.classLimit)
      : Promise.resolve(EMPTY_RENDER_CONTEXT.classes),
    needs.needsSchedule || needs.classLimit > 0
      ? getSiteScheduleClasses(studio.id)
      : Promise.resolve(EMPTY_RENDER_CONTEXT.scheduleClasses),
    needs.eventLimit > 0
      ? getSiteEvents(studio.id, needs.eventLimit)
      : Promise.resolve(EMPTY_RENDER_CONTEXT.events),
    needs.productLimit > 0
      ? getSiteProducts(studio.id, needs.productLimit)
      : Promise.resolve(EMPTY_RENDER_CONTEXT.products),
    needs.staffLimit > 0
      ? getSiteStaff(studio.id, needs.staffLimit)
      : Promise.resolve(EMPTY_RENDER_CONTEXT.staff),
  ]);

  const context = { classes, scheduleClasses, events, products, staff };

  return (
    <SiteChrome
      studioName={studio.name}
      logoUrl={branding.logoUrl}
      tagline={branding.tagline}
      siteSettings={branding.siteSettings}
      nav={nav}
    >
      <BlockRenderer blocks={page.blocks} context={context} />
    </SiteChrome>
  );
}
