// ============================================================================
//  /portal/admin/site/[pageId] — Block editor for a single website page.
// ============================================================================

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizeBlocks } from "@/lib/site/blocks";
import { normalizePageBackground } from "@/lib/site/background";
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
    .select("id, title, slug, blocks, background, status, is_home, show_in_nav, nav_label, nav_order, seo_title, seo_description")
    .eq("id", pageId)
    .single();

  if (!page) notFound();

  return (
    <PageEditor
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
