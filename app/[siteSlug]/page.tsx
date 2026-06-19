// ============================================================================
//  /[siteSlug] — public studio website sub-pages (e.g. /about, /classes).
//  Static routes (/portal, /login, /enrol, /onboarding, /programmes, /api)
//  take precedence over this dynamic segment, so only studio-defined page
//  slugs resolve here. The homepage lives at / (app/page.tsx).
// ============================================================================

import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { resolveStudio } from "@/lib/tenant";
import { getPublishedPageCached } from "@/lib/site/cached-queries";
import { PublicSite } from "@/components/site/PublicSite";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ siteSlug: string }>;
}): Promise<Metadata> {
  const { siteSlug } = await params;
  const host = (await headers()).get("host");
  const studio = await resolveStudio(host);
  if (!studio) return {};

  const page = await getPublishedPageCached(studio.id, siteSlug);
  if (!page) return {};

  return {
    title: page.seoTitle || `${page.title} · ${studio.name}`,
    description: page.seoDescription || undefined,
  };
}

export default async function SitePage({
  params,
}: {
  params: Promise<{ siteSlug: string }>;
}) {
  const { siteSlug } = await params;
  const host = (await headers()).get("host");
  const studio = await resolveStudio(host);
  if (!studio) notFound();

  const page = await getPublishedPageCached(studio.id, siteSlug);
  if (!page) notFound();

  return <PublicSite studio={{ id: studio.id, name: studio.name }} page={page} />;
}
