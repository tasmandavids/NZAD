// ============================================================================
//  lib/site/personalize.ts — inject studio-specific copy into template blocks.
// ============================================================================

import type { Block, BlockProps, PropValue } from "./blocks";

export type StudioContext = {
  studioName: string;
  tagline?: string | null;
};

const DEFAULT_TAGLINE = "World-class instruction in a welcoming space.";

function applyTokens(text: string, ctx: StudioContext): string {
  const tagline = ctx.tagline?.trim() || DEFAULT_TAGLINE;
  return text
    .replace(/\{\{studioName\}\}/g, ctx.studioName)
    .replace(/\{\{tagline\}\}/g, tagline);
}

function personalizeValue(value: PropValue, ctx: StudioContext): PropValue {
  if (typeof value === "string") return applyTokens(value, ctx);
  if (Array.isArray(value)) {
    return value.map((item) => {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(item)) {
        out[k] = applyTokens(v, ctx);
      }
      return out;
    });
  }
  return value;
}

/** Deep-personalize block props (strings + list item strings). */
export function personalizeProps(props: BlockProps, ctx: StudioContext): BlockProps {
  const out: BlockProps = {};
  for (const [key, val] of Object.entries(props)) {
    out[key] = personalizeValue(val, ctx);
  }
  return out;
}

export function personalizeBlocks(blocks: Block[], ctx: StudioContext): Block[] {
  return blocks.map((b) => ({
    ...b,
    props: personalizeProps(b.props, ctx),
  }));
}
