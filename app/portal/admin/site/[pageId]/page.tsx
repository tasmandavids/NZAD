// ============================================================================
//  /portal/admin/site/[pageId] — Block editor for a single website page.
// ============================================================================

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBranding } from "@/lib/branding";
import { normalizeBlocks } from "@/lib/site/blocks";
import { normalizePageBackground } from "@/lib/site/background";
import { mergePageLinks, toPageLink, toStudioPageNavSource } from "@/lib/site/page-links";
import { publicPageUrl } from "@/lib/site/domain-setup";
import PageEditor from "@/components/admin/site/PageEditor";

export default async function SitePageEditor({
  params,
}: {
  params: Promise<{ pageId: string }>;
}) {
  const { pageId } = await params;
  const supabase = await createClient();

  const { data: page } = await supabase
    .from("site_pages")
    .select(
      "id, studio_id, title, slug, blocks, background, status, is_home, show_in_nav, nav_label, nav_order, seo_title, seo_description, studios!inner(slug)",
    )
    .eq("id", pageId)
    .single();

  if (!page) notFound();

  const studioSlug = (page.studios as { slug: string }).slug;
  const livePreviewUrl = publicPageUrl(studioSlug, {
    isHome: page.is_home as boolean,
    pageSlug: page.slug as string,
  });

  const { data: studioPages } = await supabase
    .from("site_pages")
    .select("id, title, slug, is_home, nav_label, show_in_nav, nav_order")
    .eq("studio_id", page.studio_id as string)
    .order("nav_order", { ascending: true });

  const branding = await getBranding(supabase, page.studio_id as string);
  const { data: studio } = await supabase
    .from("studios")
    .select("name")
    .eq("id", page.studio_id as string)
    .single();

  const sitePages = mergePageLinks((studioPages ?? []).map(toPageLink));
  const navSources = (studioPages ?? []).map(toStudioPageNavSource);

  return (
    <PageEditor
      livePreviewUrl={livePreviewUrl}
      studioName={studio?.name ?? "Your studio"}
      logoUrl={branding.logoUrl}
      portalLabel={branding.siteSettings.portalLabel ?? "Portal"}
      studioPages={navSources}
      sitePages={sitePages}
      page={{
        id: page.id as string,
        title: page.title as string,
        slug: page.slug as string,
        status: page.status as "draft" | "published",
        isHome: page.is_home as boolean,
        showInNav: page.show_in_nav as boolean,
        navLabel: (page.nav_label as string | null) ?? "",
        navOrder: (page.nav_order as number) ?? 0,
        seoTitle: (page.seo_title as string | null) ?? "",
        seoDescription: (page.seo_description as string | null) ?? "",
        blocks: normalizeBlocks(page.blocks),
        background: normalizePageBackground(page.background),
      }}
    />
  );
}
