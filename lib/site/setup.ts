// ============================================================================
//  lib/site/setup.ts — website setup plans for new studio owners.
// ============================================================================

import { HOME_TEMPLATES, TEMPLATE_MAP, buildTemplateBlocks, type PageTemplate } from "./templates";
import { personalizeBlocks } from "./personalize";
import { TYPOGRAPHY_PAIRS, getTypographyPair } from "./typography";
import type { ThemeBase } from "@/lib/types";

/** All 20 homepage themes offered in the setup wizard. */
export const SETUP_HOME_IDS = HOME_TEMPLATES.map((t) => t.id) as [
  string,
  ...string[],
];

export type SetupHomeId = (typeof SETUP_HOME_IDS)[number];

/** Optional sub-pages the owner can tick during setup. */
export const SETUP_PAGE_OPTIONS: Array<{ id: string; defaultChecked: boolean }> = [
  { id: "page-about", defaultChecked: true },
  { id: "page-classes", defaultChecked: true },
  { id: "page-contact", defaultChecked: true },
  { id: "page-schedule", defaultChecked: false },
  { id: "page-people", defaultChecked: false },
  { id: "page-news", defaultChecked: false },
  { id: "page-shop", defaultChecked: false },
];

export { TYPOGRAPHY_PAIRS as FONT_PAIRS, TYPOGRAPHY_PAIRS } from "./typography";

export type SetupInput = {
  homeTemplateId: string;
  pageTemplateIds: string[];
  studioName: string;
  tagline?: string | null;
  fontDisplay: string;
  fontBody: string;
  brandColor?: string;
  base?: ThemeBase;
  logoUrl?: string | null;
};

export type SetupPageDraft = {
  templateId: string;
  title: string;
  slug: string;
  isHome: boolean;
  showInNav: boolean;
  navLabel: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  blocks: ReturnType<typeof buildTemplateBlocks>;
};

export type TemplateBrandingSuggestion = {
  brandColor: string;
  base: ThemeBase;
  typographyId: string;
  fontDisplay: string;
  fontBody: string;
};

/** Branding defaults suggested when a template is selected. */
export function getTemplateBrandingSuggestion(templateId: string): TemplateBrandingSuggestion {
  const template = TEMPLATE_MAP[templateId];
  const typography = template?.suggestedTypographyId
    ? getTypographyPair(template.suggestedTypographyId)
    : TYPOGRAPHY_PAIRS[0];

  return {
    brandColor: template?.suggestedBrandColor ?? "#6B66C9",
    base: template?.suggestedBase ?? "light",
    typographyId: typography.id,
    fontDisplay: typography.display,
    fontBody: typography.body,
  };
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function templateToDraft(template: PageTemplate, ctx: { studioName: string; tagline?: string | null }): SetupPageDraft {
  const slug = template.isHome ? "home" : slugify(template.slug || template.title);
  const blocks = personalizeBlocks(buildTemplateBlocks(template.blocks), {
    studioName: ctx.studioName,
    tagline: ctx.tagline,
  });
  return {
    templateId: template.id,
    title: template.title,
    slug,
    isHome: !!template.isHome,
    showInNav: template.showInNav ?? false,
    navLabel: template.navLabel ?? null,
    seoTitle: template.seoTitle ?? null,
    seoDescription: template.seoDescription ?? null,
    blocks,
  };
}

/** Build the list of pages that will be created for a setup request. */
export function buildSetupPages(input: SetupInput): SetupPageDraft[] {
  const home = TEMPLATE_MAP[input.homeTemplateId];
  if (!home?.isHome) throw new Error(`Unknown home template: ${input.homeTemplateId}`);

  const ctx = { studioName: input.studioName, tagline: input.tagline };
  const pages: SetupPageDraft[] = [templateToDraft(home, ctx)];

  const seen = new Set<string>(["home"]);
  for (const id of input.pageTemplateIds) {
    const t = TEMPLATE_MAP[id];
    if (!t || t.isHome) continue;
    const slug = slugify(t.slug || t.title);
    if (seen.has(slug)) continue;
    seen.add(slug);
    pages.push(templateToDraft(t, ctx));
  }

  return pages;
}

/** Validate setup input; returns error message or null if ok. */
export function validateSetupInput(input: Partial<SetupInput>): string | null {
  if (!input.studioName?.trim()) return "Studio name is required.";
  if (!input.homeTemplateId || !TEMPLATE_MAP[input.homeTemplateId]?.isHome) {
    return "Pick a homepage style.";
  }
  if (!input.fontDisplay?.trim() || !input.fontBody?.trim()) return "Pick a font pairing.";
  for (const id of input.pageTemplateIds ?? []) {
    const t = TEMPLATE_MAP[id];
    if (!t || t.isHome) return `Invalid page template: ${id}`;
  }
  return null;
}
