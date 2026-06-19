// ============================================================================
//  lib/site/template-types.ts — shared types for site page templates.
// ============================================================================

import type { BlockProps, BlockType } from "./blocks";

export type TemplateBlock = {
  type: BlockType;
  props?: Partial<BlockProps>;
};

export type TemplateCategory =
  | "minimal"
  | "bold"
  | "visual"
  | "community"
  | "professional"
  | "elegant"
  | "modern"
  | "editorial"
  | "complete";

export type PageTemplate = {
  id: string;
  kind: "home" | "page";
  /** Filter chip in the template gallery. */
  category?: TemplateCategory;
  /** Default page title. */
  title: string;
  /** Default slug (sub-pages only; home always becomes "home"). */
  slug?: string;
  isHome?: boolean;
  showInNav?: boolean;
  navLabel?: string;
  seoTitle?: string;
  seoDescription?: string;
  blocks: TemplateBlock[];
  /** Suggested brand colour when this template is selected. */
  suggestedBrandColor?: string;
  /** Suggested light/dark base. */
  suggestedBase?: "dark" | "light";
  /** Typography pair id from lib/site/typography.ts */
  suggestedTypographyId?: string;
  /** Accent for template card preview swatch. */
  previewAccent?: string;
};

export const TEMPLATE_CATEGORIES: { id: TemplateCategory | "all" }[] = [
  { id: "all" },
  { id: "minimal" },
  { id: "bold" },
  { id: "visual" },
  { id: "community" },
  { id: "professional" },
  { id: "elegant" },
  { id: "modern" },
  { id: "editorial" },
  { id: "complete" },
];
