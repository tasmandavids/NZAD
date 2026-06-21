// ============================================================================
//  lib/site/render-context.ts — data passed into BlockRenderer from the page.
// ============================================================================

import {
  getSiteClasses,
  getSiteEvents,
  getSiteProducts,
  getSiteScheduleClasses,
  getSiteStaff,
  type SiteClass,
  type SiteEvent,
  type SiteProduct,
  type SiteStaff,
} from "./queries";

export type RenderContext = {
  classes: SiteClass[];
  scheduleClasses: SiteClass[];
  events: SiteEvent[];
  products: SiteProduct[];
  staff: SiteStaff[];
};

export const EMPTY_RENDER_CONTEXT: RenderContext = {
  classes: [],
  scheduleClasses: [],
  events: [],
  products: [],
  staff: [],
};

/** Live catalog data for the site editor — scoped to one studio. */
export async function loadEditorRenderContext(studioId: string): Promise<RenderContext> {
  const [classes, scheduleClasses, events, products, staff] = await Promise.all([
    getSiteClasses(studioId, 50),
    getSiteScheduleClasses(studioId),
    getSiteEvents(studioId, 12),
    getSiteProducts(studioId, 24),
    getSiteStaff(studioId, 24),
  ]);

  return { classes, scheduleClasses, events, products, staff };
}
