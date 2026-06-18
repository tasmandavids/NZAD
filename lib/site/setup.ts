// ============================================================================
//  lib/site/setup.ts — website setup plans for new studio owners.
// ============================================================================

import { TEMPLATE_MAP, buildTemplateBlocks, type PageTemplate } from "./templates";
import { personalizeBlocks } from "./personalize";

/** Homepage themes offered in the setup wizard. */
export const SETUP_HOME_IDS = [
  "home-classic",
  "home-showcase",
  "home-minimal",
  "home-bold",
] as const;

export type SetupHomeId = (typeof SETUP_HOME_IDS)[number];

/** Optional sub-pages the owner can tick during setup. */
export const SETUP_PAGE_OPTIONS: Array<{ id: string; label: string; defaultChecked: boolean }> = [
  { id: "page-about", label: "About", defaultChecked: true },
  { id: "page-classes", label: "Classes", defaultChecked: true },
  { id: "page-contact", label: "Contact", defaultChecked: true },
  { id: "page-schedule", label: "Schedule", defaultChecked: false },
  { id: "page-people", label: "People / instructors", defaultChecked: false },
  { id: "page-news", label: "News & events", defaultChecked: false },
  { id: "page-shop", label: "Shop", defaultChecked: false },
];

export const FONT_PAIRS = [
  { id: "fraunces-hanken", label: "Elegant serif", display: "Fraunces", body: "Hanken Grotesk" },
  { id: "cormorant-inter", label: "Classic editorial", display: "Cormorant Garamond", body: "Inter" },
  { id: "archivo", label: "Modern geometric", display: "Archivo", body: "Archivo" },
  { id: "sora-outfit", label: "Clean & friendly", display: "Sora", body: "Outfit" },
] as const;

export type SetupInput = {
  homeTemplateId: SetupHomeId;
  pageTemplateIds: string[];
  studioName: string;
  tagline?: string | null;
  fontDisplay: string;
  fontBody: string;
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
  if (!input.homeTemplateId || !SETUP_HOME_IDS.includes(input.homeTemplateId as SetupHomeId)) {
    return "Pick a homepage style.";
  }
  if (!input.fontDisplay?.trim() || !input.fontBody?.trim()) return "Pick a font pairing.";
  for (const id of input.pageTemplateIds ?? []) {
    const t = TEMPLATE_MAP[id];
    if (!t || t.isHome) return `Invalid page template: ${id}`;
  }
  return null;
}
