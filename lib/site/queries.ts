// ============================================================================
//  lib/site/queries.ts — server-side reads for the public website.
//  Uses the request-scoped (anon) Supabase client; RLS exposes only PUBLISHED
//  pages to anonymous visitors.
// ============================================================================

import { createClient } from "@/lib/supabase/server";
import { normalizeBlocks, type Block } from "./blocks";

export type PublicPage = {
  id: string;
  slug: string;
  title: string;
  blocks: Block[];
  seoTitle: string | null;
  seoDescription: string | null;
};

export type NavLink = {
  slug: string;
  label: string;
  isHome: boolean;
};

/** A class summary for the `classGrid` block. */
export type SiteClass = {
  id: string;
  name: string;
  discipline: string | null;
  level: string | null;
  priceCents: number;
};

/** Published homepage for a studio (the page flagged is_home). */
export async function getPublishedHome(studioId: string): Promise<PublicPage | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_pages")
    .select("id, slug, title, blocks, seo_title, seo_description")
    .eq("studio_id", studioId)
    .eq("status", "published")
    .eq("is_home", true)
    .maybeSingle();
  return data ? toPublicPage(data) : null;
}

/** Published page for a studio by slug. */
export async function getPublishedPage(
  studioId: string,
  slug: string,
): Promise<PublicPage | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_pages")
    .select("id, slug, title, blocks, seo_title, seo_description")
    .eq("studio_id", studioId)
    .eq("status", "published")
    .eq("slug", slug)
    .maybeSingle();
  return data ? toPublicPage(data) : null;
}

/** Navigation links from published, in-nav pages (home first). */
export async function getNavLinks(studioId: string): Promise<NavLink[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_pages")
    .select("slug, title, nav_label, is_home, show_in_nav, nav_order")
    .eq("studio_id", studioId)
    .eq("status", "published")
    .eq("show_in_nav", true)
    .order("is_home", { ascending: false })
    .order("nav_order", { ascending: true });

  return (data ?? []).map((p) => ({
    slug: p.is_home ? "" : (p.slug as string),
    label: (p.nav_label as string | null) || (p.title as string),
    isHome: p.is_home as boolean,
  }));
}

/** Active classes for the classGrid block (public-readable via RLS). */
export async function getSiteClasses(studioId: string, limit = 6): Promise<SiteClass[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("classes")
    .select("id, name, discipline, level, price_cents")
    .eq("studio_id", studioId)
    .order("name")
    .limit(Math.max(1, Math.min(50, limit)));

  return (data ?? []).map((c) => ({
    id: c.id as string,
    name: c.name as string,
    discipline: c.discipline as string | null,
    level: c.level as string | null,
    priceCents: (c.price_cents as number | null) ?? 0,
  }));
}

type Row = {
  id: string;
  slug: string;
  title: string;
  blocks: unknown;
  seo_title: string | null;
  seo_description: string | null;
};

function toPublicPage(row: Row): PublicPage {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    blocks: normalizeBlocks(row.blocks),
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
  };
}
