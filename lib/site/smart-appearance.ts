// ============================================================================
//  lib/site/smart-appearance.ts — auto-populate section colors when adding blocks.
// ============================================================================

import { APPEARANCE_DEFAULTS, BLOCK_MAP, type Block, type BlockProps, type BlockType } from "./blocks";
import { isCanvasWidget } from "./layout";

const SECTION_BG_CYCLE = ["base", "surface", "tint"] as const;

/** Blocks that keep their curated default background instead of the cycle. */
const FIXED_BG_TYPES = new Set<BlockType>(["features", "testimonials", "contact", "locations", "cta", "hero"]);

function sectionBlockCount(blocks: Block[]): number {
  return blocks.filter((b) => !isCanvasWidget(b.type) && BLOCK_MAP[b.type]?.appearance).length;
}

/** Suggest appearance + frame props for a newly placed block. */
export function smartAppearanceForNewBlock(type: BlockType, existingBlocks: Block[]): Partial<BlockProps> {
  const def = BLOCK_MAP[type];
  if (!def) return {};

  if (isCanvasWidget(type)) {
    const extras: Partial<BlockProps> = {};
    if (type === "imageBlock") {
      extras._shadow = "md";
      extras._radius = "md";
      extras._padding = "sm";
    }
    if (type === "heading") {
      extras.textColor = "ink";
      extras._padding = "sm";
    }
    if (type === "paragraph") {
      extras.textColor = "muted";
      extras._padding = "sm";
    }
    if (type === "linkBlock") {
      extras._fill = "none";
      extras._padding = "sm";
    }
    if (type === "videoBlock") {
      extras._radius = "md";
      extras._shadow = "sm";
    }
    return extras;
  }

  if (!def.appearance || FIXED_BG_TYPES.has(type)) {
    const curated = APPEARANCE_DEFAULTS[type];
    return curated ? { _bg: curated._bg, _spacing: curated._spacing } : {};
  }

  const cycleBg = SECTION_BG_CYCLE[sectionBlockCount(existingBlocks) % SECTION_BG_CYCLE.length];
  const curated = APPEARANCE_DEFAULTS[type];
  return {
    _bg: cycleBg,
    _spacing: curated?._spacing ?? "normal",
  };
}

/** Merge smart defaults into a block without overwriting explicit template props. */
export function applySmartAppearance(block: Block, existingBlocks: Block[]): Block {
  const smart = smartAppearanceForNewBlock(block.type, existingBlocks);
  const props = { ...block.props };
  for (const [key, value] of Object.entries(smart)) {
    if (value === undefined) continue;
    const current = props[key];
    const layoutDefault = key.startsWith("_") ? undefined : BLOCK_MAP[block.type]?.defaultProps[key];
    if (current === undefined || current === layoutDefault) {
      props[key] = value;
    }
  }
  return { ...block, props };
}
