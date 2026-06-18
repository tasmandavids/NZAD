// ============================================================================
//  lib/site/layout.ts — freeform canvas positioning helpers for site blocks.
// ============================================================================

import type { CSSProperties } from "react";
import type { Block, BlockProps, BlockType } from "./blocks";
import { frameClassExtras, framePaddingClass, frameStyleExtras } from "./block-styles";
import { num, str } from "./props";

/** 12-column grid; vertical rhythm in px. All drag/resize snaps to these units. */
export const CANVAS_GRID = {
  columns: 12,
  rowHeight: 40,
} as const;

const COL_WIDTH_PCT = 100 / CANVAS_GRID.columns;

/** Small elements that float on the grid. Full-width sections (hero, features, …) always stack. */
const CANVAS_WIDGET_TYPES: BlockType[] = [
  "heading",
  "paragraph",
  "imageBlock",
  "videoBlock",
  "linkBlock",
  "spacer",
  "divider",
];

export function isCanvasWidget(type: BlockType): boolean {
  return CANVAS_WIDGET_TYPES.includes(type);
}

export function usesCanvasInEditor(block: Block): boolean {
  return isCanvasWidget(block.type) && !isStackLayout(block.props);
}

export const LAYOUT_DEFAULTS = {
  _x: 0,
  _y: 0,
  _width: 100 / 3, // 4 columns
  _height: 0,
  _opacity: 100,
  _zIndex: 1,
  _rotate: 0,
  _shadow: "none",
  _radius: "none",
  _border: "none",
  _fill: "none",
  _padding: "none",
};

export function snapGridX(pct: number): number {
  const snapped = Math.round(pct / COL_WIDTH_PCT) * COL_WIDTH_PCT;
  return Math.min(100 - COL_WIDTH_PCT, Math.max(0, Math.round(snapped * 1000) / 1000));
}

export function snapGridY(px: number): number {
  return Math.max(0, Math.round(px / CANVAS_GRID.rowHeight) * CANVAS_GRID.rowHeight);
}

export function snapGridWidth(pct: number): number {
  const cols = Math.max(1, Math.min(CANVAS_GRID.columns, Math.round(pct / COL_WIDTH_PCT)));
  return Math.round(cols * COL_WIDTH_PCT * 1000) / 1000;
}

export function snapGridHeight(px: number): number {
  const rows = Math.max(2, Math.round(px / CANVAS_GRID.rowHeight));
  return rows * CANVAS_GRID.rowHeight;
}

/** Clamp horizontal position so the block stays inside the canvas. */
export function clampGridX(xPct: number, widthPct: number): number {
  return Math.min(100 - widthPct, Math.max(0, snapGridX(xPct)));
}

export function blockOpacity(props: BlockProps): number {
  const v = num(props, "_opacity", 100);
  return Math.min(100, Math.max(0, v)) / 100;
}

export function blockFrameStyle(props: BlockProps): CSSProperties {
  const width = num(props, "_width", LAYOUT_DEFAULTS._width);
  const style: CSSProperties = {
    position: "absolute",
    left: `${num(props, "_x", LAYOUT_DEFAULTS._x)}%`,
    top: `${num(props, "_y", LAYOUT_DEFAULTS._y)}px`,
    width: `${width}%`,
    opacity: blockOpacity(props),
    zIndex: num(props, "_zIndex", LAYOUT_DEFAULTS._zIndex),
    ...frameStyleExtras(props),
  };
  const h = num(props, "_height", 0);
  if (h > 0) {
    style.height = `${h}px`;
    style.overflow = "hidden";
  }
  return style;
}

export function blockFrameClassName(props: BlockProps): string {
  return frameClassExtras(props);
}

export function blockFramePaddingClass(props: BlockProps): string {
  return framePaddingClass(props);
}

/** Minimum canvas height so blocks aren't clipped. */
export function computeCanvasMinHeight(blocks: Block[]): number {
  let max = 480;
  for (const b of blocks) {
    if (!usesCanvasInEditor(b)) continue;
    const y = num(b.props, "_y", 0);
    const h = num(b.props, "_height", 0);
    max = Math.max(max, y + (h > 0 ? h : 280));
  }
  return max;
}

/** Keep section blocks in stack mode for editor + public rendering. */
export function normalizeBlockLayoutForSave(block: Block, index: number): BlockProps {
  if (isCanvasWidget(block.type)) return block.props;
  const props = seedLayoutDefaults(block.props, index);
  props._position = "stack";
  return props;
}

export function isStackLayout(props: BlockProps): boolean {
  return str(props, "_position", "stack") === "stack";
}

/** True when every block uses traditional vertical stacking (templates / new pages). */
export function usesStackLayout(blocks: Block[]): boolean {
  return blocks.length > 0 && blocks.every((b) => isStackLayout(b.props));
}

/** Default canvas frame from makeBlock — narrow column at the left edge. */
export function isDefaultCanvasFrame(props: BlockProps): boolean {
  const x = num(props, "_x", LAYOUT_DEFAULTS._x);
  const w = num(props, "_width", LAYOUT_DEFAULTS._width);
  return Math.abs(x - LAYOUT_DEFAULTS._x) < 0.01 && Math.abs(w - LAYOUT_DEFAULTS._width) < 0.01;
}

/** Freeform blocks that were never positioned on the canvas (still at factory defaults). */
export function looksLikeUnpositionedFreeform(blocks: Block[]): boolean {
  if (!blocks.length || usesStackLayout(blocks)) return false;
  return blocks.every((b) => isDefaultCanvasFrame(b.props));
}

/** Public site canvas layout — only when blocks were deliberately placed on the grid. */
export function usesCanvasLayout(blocks: Block[]): boolean {
  if (!blocks.length || usesStackLayout(blocks)) return false;
  return !looksLikeUnpositionedFreeform(blocks);
}

/** Fill in missing layout props without migrating to the freeform canvas. */
export function seedLayoutDefaults(props: BlockProps, index = 0): BlockProps {
  const next = { ...props };
  if (next._opacity === undefined) next._opacity = LAYOUT_DEFAULTS._opacity;
  if (next._zIndex === undefined) next._zIndex = index + 1;
  if (next._x === undefined) next._x = LAYOUT_DEFAULTS._x;
  if (next._y === undefined) next._y = LAYOUT_DEFAULTS._y;
  if (next._width === undefined) next._width = LAYOUT_DEFAULTS._width;
  if (next._height === undefined) next._height = LAYOUT_DEFAULTS._height;
  if (next._position === undefined) next._position = "stack";
  return next;
}

/** Seed layout props and migrate legacy stacked pages into canvas positions. */
export function seedLayoutProps(props: BlockProps, index = 0): BlockProps {
  const next = seedLayoutDefaults(props, index);

  if (isStackLayout(props)) {
    next._position = "freeform";
    next._y = snapGridY(index * CANVAS_GRID.rowHeight * 4);
    // Section blocks ship with widget-sized defaults — expand to full-width rows in the editor.
    next._width = snapGridWidth(90);
    next._x = snapGridX(5);
  } else if (props._y === undefined) {
    next._y = snapGridY(index * CANVAS_GRID.rowHeight * 4);
  }

  return next;
}

export function freeformDefaultsAt(y: number, width = 60): Partial<BlockProps> {
  const w = snapGridWidth(width);
  return {
    _position: "freeform",
    _x: snapGridX(5),
    _y: snapGridY(y),
    _width: w,
    _height: 0,
    _opacity: 100,
    _zIndex: 2,
  };
}

export function nextCanvasY(blocks: Block[]): number {
  if (!blocks.length) return CANVAS_GRID.rowHeight;
  return blocks.reduce<number>((max, b) => {
    const y = num(b.props, "_y", 0);
    const h = num(b.props, "_height", 0);
    return Math.max(max, y + (h > 0 ? h : CANVAS_GRID.rowHeight * 4));
  }, CANVAS_GRID.rowHeight);
}

export type LayoutPatch = {
  _x?: number;
  _y?: number;
  _width?: number;
  _height?: number;
  _rotate?: number;
  _zIndex?: number;
};

/** Snap a layout patch from the editor to the grid. */
export function snapLayoutPatch(patch: LayoutPatch): LayoutPatch {
  const out: LayoutPatch = { ...patch };
  if (out._x !== undefined) out._x = snapGridX(out._x);
  if (out._y !== undefined) out._y = snapGridY(out._y);
  if (out._width !== undefined) out._width = snapGridWidth(out._width);
  if (out._height !== undefined) out._height = out._height > 0 ? snapGridHeight(out._height) : 0;
  return out;
}
