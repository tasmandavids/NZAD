// ============================================================================
//  /site-preview/[pageId] — full-page draft preview (auth required, no portal chrome).
// ============================================================================

import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBranding } from "@/lib/branding";
import { normalizeBlocks } from "@/lib/site/blocks";
import { normalizePageBackground } from "@/lib/site/background";
import { publicPageUrl } from "@/lib/site/domain-setup";
import {
  getNavLinks,
  getSiteClasses,
  getSiteEvents,
  getSiteProducts,
  getSiteScheduleClasses,
  getSiteStaff,
  pageDataNeeds,
} from "@/lib/site/queries";
import { EMPTY_RENDER_CONTEXT } from "@/lib/site/render-context";
import { BlockRenderer } from "@/components/site/BlockRenderer";
import { SiteChrome } from "@/components/site/SiteChrome";

export default async function SitePreviewPage({
  params,
}: {
  params: Promise<{ pageId: string }>;
}) {
  const { pageId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("studio_id, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin" || !profile.studio_id) notFound();

  const { data: page } = await supabase
    .from("site_pages")
    .select("id, studio_id, title, slug, blocks, background, status, is_home, studios!inner(name, slug)")
    .eq("id", pageId)
    .eq("studio_id", profile.studio_id)
    .single();

  if (!page) notFound();

  const studio = page.studios as unknown as { name: string; slug: string };
  const blocks = normalizeBlocks(page.blocks);
  const background = normalizePageBackground(page.background);
  const needs = pageDataNeeds(blocks);

  const [branding, nav, classes, scheduleClasses, events, products, staff] = await Promise.all([
    getBranding(supabase, page.studio_id as string),
    getNavLinks(page.studio_id as string),
    needs.classLimit > 0
      ? getSiteClasses(page.studio_id as string, needs.classLimit)
      : Promise.resolve(EMPTY_RENDER_CONTEXT.classes),
    needs.needsSchedule || needs.classLimit > 0
      ? getSiteScheduleClasses(page.studio_id as string)
      : Promise.resolve(EMPTY_RENDER_CONTEXT.scheduleClasses),
    needs.eventLimit > 0
      ? getSiteEvents(page.studio_id as string, needs.eventLimit)
      : Promise.resolve(EMPTY_RENDER_CONTEXT.events),
    needs.productLimit > 0
      ? getSiteProducts(page.studio_id as string, needs.productLimit)
      : Promise.resolve(EMPTY_RENDER_CONTEXT.products),
    needs.staffLimit > 0
      ? getSiteStaff(page.studio_id as string, needs.staffLimit)
      : Promise.resolve(EMPTY_RENDER_CONTEXT.staff),
  ]);

  const liveUrl = publicPageUrl(studio.slug, {
    isHome: page.is_home as boolean,
    pageSlug: page.slug as string,
  });

  return (
    <div className="flex min-h-[100dvh] flex-col bg-base">
      <div className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b border-brand/30 bg-brand/5 px-4 py-2.5 text-sm backdrop-blur">
        <div>
          <p className="font-semibold text-ink">
            {page.status === "published" ? "Preview" : "Draft preview"} · {page.title as string}
          </p>
          <p className="text-xs text-muted">Save in the editor, then refresh to see latest changes.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/portal/admin/site/${pageId}`}
            className="rounded-full border border-[--hair] bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-base"
          >
            ← Editor
          </Link>
          {page.status === "published" && (
            <a
              href={liveUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110"
            >
              Open live site
            </a>
          )}
        </div>
      </div>

      <SiteChrome
        studioName={studio.name}
        logoUrl={branding.logoUrl}
        tagline={branding.tagline}
        siteSettings={branding.siteSettings}
        nav={nav}
      >
        <BlockRenderer blocks={blocks} context={{ classes, scheduleClasses, events, products, staff }} background={background} />
      </SiteChrome>
    </div>
  );
}
