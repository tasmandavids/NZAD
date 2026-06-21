// ============================================================================
//  lib/site/block-thumbnails.ts — mini visual previews for the element picker.
// ============================================================================

import type { CSSProperties } from "react";
import type { BlockType } from "./blocks";

export type BlockThumbnailSpec = {
  headerBg: string;
  accent: string;
  bars: Array<{ w: number; o: number }>;
};

const DEFAULT: BlockThumbnailSpec = {
  headerBg:
    "linear-gradient(135deg, color-mix(in srgb, var(--brand) 12%, var(--base)), color-mix(in srgb, var(--brand) 22%, var(--surface)))",
  accent: "var(--brand)",
  bars: [
    { w: 80, o: 0.35 },
    { w: 60, o: 0.25 },
    { w: 45, o: 0.2 },
  ],
};

const THUMBNAILS: Partial<Record<BlockType, BlockThumbnailSpec>> = {
  heading: {
    headerBg: "linear-gradient(135deg, var(--base), color-mix(in srgb, var(--brand) 8%, var(--base)))",
    accent: "var(--ink)",
    bars: [
      { w: 72, o: 0.5 },
      { w: 48, o: 0.2 },
    ],
  },
  paragraph: {
    headerBg: "linear-gradient(135deg, var(--base), var(--surface))",
    accent: "var(--muted)",
    bars: [
      { w: 90, o: 0.3 },
      { w: 85, o: 0.22 },
      { w: 70, o: 0.18 },
    ],
  },
  imageBlock: {
    headerBg: "linear-gradient(135deg, color-mix(in srgb, var(--brand) 15%, var(--surface)), var(--surface))",
    accent: "color-mix(in srgb, var(--brand) 40%, var(--surface))",
    bars: [{ w: 100, o: 0.45 }],
  },
  videoBlock: {
    headerBg: "linear-gradient(135deg, #0a0a0a, #1a1a2e)",
    accent: "var(--brand-hot)",
    bars: [{ w: 100, o: 0.5 }],
  },
  linkBlock: {
    headerBg: "linear-gradient(135deg, color-mix(in srgb, var(--brand) 18%, var(--base)), var(--base))",
    accent: "var(--brand)",
    bars: [{ w: 36, o: 0.55 }],
  },
  hero: {
    headerBg: "linear-gradient(160deg, color-mix(in srgb, var(--brand) 25%, #0a0a0a), #0a0a0a)",
    accent: "var(--brand-hot)",
    bars: [
      { w: 55, o: 0.6 },
      { w: 75, o: 0.25 },
    ],
  },
  features: {
    headerBg: "linear-gradient(135deg, var(--surface), color-mix(in srgb, var(--brand) 10%, var(--surface)))",
    accent: "var(--brand)",
    bars: [
      { w: 28, o: 0.4 },
      { w: 28, o: 0.4 },
      { w: 28, o: 0.4 },
    ],
  },
  classGrid: {
    headerBg: "linear-gradient(135deg, var(--base), color-mix(in srgb, var(--brand) 6%, var(--base)))",
    accent: "var(--brand)",
    bars: [
      { w: 42, o: 0.35 },
      { w: 42, o: 0.35 },
    ],
  },
  testimonials: {
    headerBg: "linear-gradient(135deg, color-mix(in srgb, var(--brand) 12%, var(--surface)), var(--surface))",
    accent: "var(--brand)",
    bars: [
      { w: 88, o: 0.3 },
      { w: 55, o: 0.2 },
    ],
  },
  cta: {
    headerBg: "linear-gradient(135deg, var(--brand), var(--brand-deep))",
    accent: "#ffffff",
    bars: [
      { w: 50, o: 0.5 },
      { w: 28, o: 0.35 },
    ],
  },
  gallery: {
    headerBg: "linear-gradient(135deg, var(--surface), var(--base))",
    accent: "color-mix(in srgb, var(--brand) 30%, var(--surface))",
    bars: [
      { w: 30, o: 0.4 },
      { w: 30, o: 0.4 },
      { w: 30, o: 0.4 },
    ],
  },
  contact: {
    headerBg: "linear-gradient(135deg, var(--surface), color-mix(in srgb, var(--brand) 8%, var(--surface)))",
    accent: "var(--brand)",
    bars: [
      { w: 75, o: 0.25 },
      { w: 65, o: 0.2 },
      { w: 55, o: 0.18 },
    ],
  },
  schedule: {
    headerBg: "linear-gradient(135deg, var(--base), var(--surface))",
    accent: "var(--brand)",
    bars: [
      { w: 100, o: 0.2 },
      { w: 100, o: 0.15 },
      { w: 100, o: 0.12 },
    ],
  },
  shopGrid: {
    headerBg: "linear-gradient(135deg, color-mix(in srgb, var(--brand) 10%, var(--base)), var(--surface))",
    accent: "var(--brand)",
    bars: [
      { w: 40, o: 0.35 },
      { w: 40, o: 0.35 },
    ],
  },
  divider: {
    headerBg: "var(--base)",
    accent: "var(--hair)",
    bars: [{ w: 60, o: 0.5 }],
  },
  spacer: {
    headerBg:
      "repeating-linear-gradient(45deg, var(--base), var(--base) 4px, color-mix(in srgb, var(--brand) 8%, var(--base)) 4px, color-mix(in srgb, var(--brand) 8%, var(--base)) 8px)",
    accent: "var(--muted)",
    bars: [],
  },
};

export function blockThumbnail(type: BlockType): BlockThumbnailSpec {
  return THUMBNAILS[type] ?? DEFAULT;
}

export const APPEARANCE_SWATCHES: Record<string, { style: CSSProperties }> = {
  base: { style: { background: "var(--base)" } },
  surface: { style: { background: "var(--surface)" } },
  tint: { style: { background: "color-mix(in srgb, var(--brand) 12%, var(--base))" } },
  none: { style: { background: "transparent", border: "1px dashed var(--hair)" } },
  brand: { style: { background: "color-mix(in srgb, var(--brand) 20%, var(--base))" } },
  blur: { style: { background: "color-mix(in srgb, var(--surface) 85%, transparent)" } },
};
