// ============================================================================
//  lib/site/layout.ts — freeform canvas positioning helpers for site blocks.
// ============================================================================

import type { CSSProperties } from "react";
import type { Block, BlockProps } from "./blocks";
import { num, str } from "./props";

export const LAYOUT_DEFAULTS = {
  _x: 5,
  _y: 0,
  _width: 70,
  _opacity: 100,
  _zIndex: 1,
};

export function blockOpacity(props: BlockProps): number {
  const v = num(props, "_opacity", 100);
  return Math.min(100, Math.max(0, v)) / 100;
}

export function blockFrameStyle(props: BlockProps): CSSProperties {
  return {
    position: "absolute",
    left: `${num(props, "_x", LAYOUT_DEFAULTS._x)}%`,
    top: `${num(props, "_y", LAYOUT_DEFAULTS._y)}px`,
    width: `${num(props, "_width", LAYOUT_DEFAULTS._width)}%`,
    opacity: blockOpacity(props),
    zIndex: num(props, "_zIndex", LAYOUT_DEFAULTS._zIndex),
  };
}

/** Minimum canvas height so blocks aren't clipped. */
export function computeCanvasMinHeight(blocks: Block[]): number {
  let max = 480;
  for (const b of blocks) {
    const y = num(b.props, "_y", 0);
    max = Math.max(max, y + 280);
  }
  return max;
}

/** Seed layout props and migrate legacy stacked pages into canvas positions. */
export function seedLayoutProps(props: BlockProps, index = 0): BlockProps {
  const next = { ...props };
  const legacyStack = str(props, "_position", "stack") === "stack";

  if (next._opacity === undefined) next._opacity = LAYOUT_DEFAULTS._opacity;
  if (next._zIndex === undefined) next._zIndex = index + 1;
  if (next._x === undefined) next._x = LAYOUT_DEFAULTS._x;
  if (next._width === undefined) next._width = legacyStack ? 90 : LAYOUT_DEFAULTS._width;
  if (legacyStack || next._y === undefined) next._y = index * 160;

  return next;
}

export function freeformDefaultsAt(y: number, width = 60): Partial<BlockProps> {
  return {
    _x: 5,
    _y: Math.round(y),
    _width: width,
    _opacity: 100,
    _zIndex: 2,
  };
}

export function nextCanvasY(blocks: Block[]): number {
  if (!blocks.length) return 40;
  return blocks.reduce((max, b) => Math.max(max, num(b.props, "_y", 0) + 160), 40);
}
