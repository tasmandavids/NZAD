// ============================================================================
//  lib/site/render-context.ts — data passed into BlockRenderer from the page.
// ============================================================================

import type { SiteClass, SiteEvent, SiteProduct, SiteStaff } from "./queries";

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
