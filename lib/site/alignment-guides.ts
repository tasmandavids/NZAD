// ============================================================================
//  lib/site/alignment-guides.ts — smart snap guides while dragging blocks.
// ============================================================================

import type { Block, BlockProps } from "./blocks";
import { snapGridX, snapGridY } from "./layout";
import { num } from "./props";

export type GuideLine =
  | { axis: "x"; pct: number }
  | { axis: "y"; px: number };

export type BlockRect = {
  id: string;
  left: number;
  right: number;
  centerX: number;
  top: number;
  bottom: number;
  centerY: number;
  width: number;
  height: number;
};

const DEFAULT_H = 160;

export function blockRect(props: BlockProps, id: string, height = DEFAULT_H): BlockRect {
  const x = num(props, "_x", 0);
  const w = num(props, "_width", 33.333);
  const y = num(props, "_y", 0);
  const h = num(props, "_height", 0) || height;
  return {
    id,
    left: x,
    right: x + w,
    centerX: x + w / 2,
    top: y,
    bottom: y + h,
    centerY: y + h / 2,
    width: w,
    height: h,
  };
}

export function rectsFromBlocks(blocks: Block[], excludeId?: string): BlockRect[] {
  return blocks.filter((b) => b.id !== excludeId).map((b) => blockRect(b.props, b.id));
}

export function movingRect(
  id: string,
  xPct: number,
  yPx: number,
  widthPct: number,
  heightPx: number,
): BlockRect {
  return blockRect(
    { _x: xPct, _y: yPx, _width: widthPct, _height: heightPx },
    id,
    heightPx,
  );
}

type SnapResult = { x: number; y: number; guides: GuideLine[] };

/** Snap position to nearby block edges/centers and canvas center. */
export function snapWithAlignmentGuides(
  moving: BlockRect,
  others: BlockRect[],
  canvasWidthPx: number,
  thresholdPx = 8,
): SnapResult {
  const threshPct = (thresholdPx / Math.max(canvasWidthPx, 1)) * 100;
  const threshY = thresholdPx;
  const { width, height } = moving;

  let bestX = moving.left;
  let bestY = moving.top;
  let minDx = threshPct + 1;
  let minDy = threshY + 1;

  const tryX = (snapLeft: number, dist: number) => {
    if (dist <= threshPct && dist < minDx) {
      minDx = dist;
      bestX = snapLeft;
    }
  };

  const tryY = (snapTop: number, dist: number) => {
    if (dist <= threshY && dist < minDy) {
      minDy = dist;
      bestY = snapTop;
    }
  };

  // Canvas center
  tryX(50 - width / 2, Math.abs(moving.centerX - 50));

  for (const o of others) {
    tryX(o.left, Math.abs(moving.left - o.left));
    tryX(o.right - width, Math.abs(moving.right - o.right));
    tryX(o.centerX - width / 2, Math.abs(moving.centerX - o.centerX));
    tryX(o.right, Math.abs(moving.left - o.right));
    tryX(o.left - width, Math.abs(moving.right - o.left));

    tryY(o.top, Math.abs(moving.top - o.top));
    tryY(o.bottom - height, Math.abs(moving.bottom - o.bottom));
    tryY(o.centerY - height / 2, Math.abs(moving.centerY - o.centerY));
    tryY(o.bottom, Math.abs(moving.top - o.bottom));
    tryY(o.top - height, Math.abs(moving.bottom - o.top));
  }

  const snappedLeft = snapGridX(Math.max(0, Math.min(100 - width, bestX)));
  const snappedTop = snapGridY(Math.max(0, bestY));
  const snapped = movingRect(moving.id, snappedLeft, snappedTop, width, height);

  const guides: GuideLine[] = [];
  const near = (a: number, b: number, t: number) => Math.abs(a - b) <= t;

  if (near(snapped.centerX, 50, threshPct)) guides.push({ axis: "x", pct: 50 });

  for (const o of others) {
    if (near(snapped.left, o.left, threshPct)) guides.push({ axis: "x", pct: o.left });
    if (near(snapped.right, o.right, threshPct)) guides.push({ axis: "x", pct: o.right });
    if (near(snapped.centerX, o.centerX, threshPct)) guides.push({ axis: "x", pct: o.centerX });
    if (near(snapped.top, o.top, threshY)) guides.push({ axis: "y", px: o.top });
    if (near(snapped.bottom, o.bottom, threshY)) guides.push({ axis: "y", px: o.bottom });
    if (near(snapped.centerY, o.centerY, threshY)) guides.push({ axis: "y", px: o.centerY });
  }

  return { x: snappedLeft, y: snappedTop, guides };
}
