// ============================================================================
//  lib/builder/cascade.ts — responsive cascade + StyleSet→CSS compiler.
//
//  resolveStyle() is called by every NodeView on every render. It:
//    1. Cascades the responsive layers. Desktop-first (default): start at the
//       desktop base and fold in each wider→narrower override up to (and
//       including) the active breakpoint, so a mobile tweak inherits everything
//       not overridden but stays isolated to mobile. Mobile-first reverses it.
//    2. Folds in the requested interaction state (hover/active/focus) for
//       preview, or — in the editor — we render base and drive states via CSS.
//    3. Compiles the merged StyleSet into a React.CSSProperties, translating the
//       hybrid layout modes, box-edge shorthands, transforms, text gradients,
//       and token references (→ CSS variables).
// ============================================================================

import type { CSSProperties } from "react";
import type {
  BreakpointId,
  BuilderNode,
  BoxEdges,
  Dim,
  InteractionState,
  StyleSet,
} from "./schema";
import { BREAKPOINT_ORDER } from "./schema";
import { isTokenRef, resolveTokenValue } from "./tokens";

export interface ResolveOpts {
  breakpoint: BreakpointId;
  cascade: "desktop-first" | "mobile-first";
  state?: InteractionState;
}

/** Merge the responsive layers for a node into one flat StyleSet. */
export function cascadeStyle(node: BuilderNode, opts: ResolveOpts): StyleSet {
  const { breakpoint, cascade, state } = opts;
  const order = BREAKPOINT_ORDER; // [desktop, tablet, mobileL, mobileP]
  const targetIdx = order.indexOf(breakpoint);

  // Which layers apply, in application order (later wins).
  let layers: BreakpointId[];
  if (cascade === "desktop-first") {
    // base(desktop) … down to active breakpoint
    layers = order.slice(0, targetIdx + 1);
  } else {
    // mobile-first: narrowest base … up to active breakpoint
    const rev = [...order].reverse(); // [mobileP, mobileL, tablet, desktop]
    const ti = rev.indexOf(breakpoint);
    layers = rev.slice(0, ti + 1);
  }

  let merged: StyleSet = { ...node.style };
  for (const bp of layers) {
    if (bp === "desktop") continue; // desktop === node.style (the base)
    const override = node.responsive?.[bp];
    if (override) merged = { ...merged, ...override };
  }
  if (state && node.states?.[state]) {
    merged = { ...merged, ...node.states[state] };
  }
  return merged;
}

/** Full pipeline: cascade then compile to CSSProperties. */
export function resolveStyle(node: BuilderNode, opts: ResolveOpts): CSSProperties {
  return compileStyle(cascadeStyle(node, opts), node);
}

// ─── StyleSet → CSSProperties ───────────────────────────────────────────────────

function dim(v: Dim | undefined): string | undefined {
  if (v === undefined) return undefined;
  return typeof v === "number" ? `${v}px` : v;
}

/** Resolve a value that may be a token ref. */
function tok(v: string | number | undefined): string | undefined {
  if (v === undefined) return undefined;
  if (typeof v === "number") return `${v}px`;
  return isTokenRef(v) ? resolveTokenValue(v) : v;
}

function edges(box: BoxEdges | undefined): {
  top?: string; right?: string; bottom?: string; left?: string;
} | undefined {
  if (!box) return undefined;
  const all = box.all;
  return {
    top: dim(box.top ?? all),
    right: dim(box.right ?? all),
    bottom: dim(box.bottom ?? all),
    left: dim(box.left ?? all),
  };
}

export function compileStyle(s: StyleSet, node?: BuilderNode): CSSProperties {
  const css: CSSProperties = {};

  // --- container layout mode -----------------------------------------------
  switch (s.layout) {
    case "flex":
      css.display = "flex";
      if (s.flexDirection) css.flexDirection = s.flexDirection;
      if (s.flexWrap) css.flexWrap = s.flexWrap;
      if (s.justifyContent) css.justifyContent = s.justifyContent;
      if (s.alignItems) css.alignItems = s.alignItems;
      if (s.alignContent) css.alignContent = s.alignContent;
      if (s.gap !== undefined) css.gap = dim(s.gap);
      break;
    case "grid":
      css.display = "grid";
      if (s.gridTemplateColumns) css.gridTemplateColumns = s.gridTemplateColumns;
      if (s.gridTemplateRows) css.gridTemplateRows = s.gridTemplateRows;
      if (s.gridAutoFlow) css.gridAutoFlow = s.gridAutoFlow;
      if (s.gridAutoRows) css.gridAutoRows = s.gridAutoRows;
      if (s.justifyContent) css.justifyContent = s.justifyContent;
      if (s.alignItems) css.alignItems = s.alignItems;
      if (s.gap !== undefined) css.gap = dim(s.gap);
      break;
    case "absolute":
      // Container is the positioning reference for its freeform children.
      css.display = "block";
      css.position = s.position ?? "relative";
      break;
    case "flow":
    default:
      if (s.layout === "flow") css.display = "block";
      break;
  }

  // --- self positioning -----------------------------------------------------
  if (s.position && s.layout !== "absolute") css.position = s.position;
  if (s.top !== undefined) css.top = dim(s.top);
  if (s.right !== undefined) css.right = dim(s.right);
  if (s.bottom !== undefined) css.bottom = dim(s.bottom);
  if (s.left !== undefined) css.left = dim(s.left);
  if (s.zIndex !== undefined) css.zIndex = s.zIndex;
  if (s.flexGrow !== undefined) css.flexGrow = s.flexGrow;
  if (s.flexShrink !== undefined) css.flexShrink = s.flexShrink;
  if (s.flexBasis !== undefined) css.flexBasis = dim(s.flexBasis);
  if (s.alignSelf) css.alignSelf = s.alignSelf;
  if (s.gridColumn) css.gridColumn = s.gridColumn;
  if (s.gridRow) css.gridRow = s.gridRow;

  // --- box ------------------------------------------------------------------
  if (s.width !== undefined) css.width = dim(s.width);
  if (s.height !== undefined) css.height = dim(s.height);
  if (s.minWidth !== undefined) css.minWidth = dim(s.minWidth);
  if (s.minHeight !== undefined) css.minHeight = dim(s.minHeight);
  if (s.maxWidth !== undefined) css.maxWidth = dim(s.maxWidth);
  if (s.maxHeight !== undefined) css.maxHeight = dim(s.maxHeight);
  if (s.overflow) css.overflow = s.overflow;
  if (s.aspectRatio) css.aspectRatio = s.aspectRatio;

  const pad = edges(s.padding);
  if (pad) {
    if (pad.top !== undefined) css.paddingTop = pad.top;
    if (pad.right !== undefined) css.paddingRight = pad.right;
    if (pad.bottom !== undefined) css.paddingBottom = pad.bottom;
    if (pad.left !== undefined) css.paddingLeft = pad.left;
  }
  const mar = edges(s.margin);
  if (mar) {
    if (mar.top !== undefined) css.marginTop = mar.top;
    if (mar.right !== undefined) css.marginRight = mar.right;
    if (mar.bottom !== undefined) css.marginBottom = mar.bottom;
    if (mar.left !== undefined) css.marginLeft = mar.left;
  }

  // --- appearance -----------------------------------------------------------
  if (s.background !== undefined) css.background = tok(s.background);
  if (s.backgroundImage) css.backgroundImage = s.backgroundImage;
  if (s.backgroundSize) css.backgroundSize = s.backgroundSize;
  if (s.backgroundPosition) css.backgroundPosition = s.backgroundPosition;
  if (s.opacity !== undefined) css.opacity = s.opacity;
  if (s.borderRadius !== undefined) css.borderRadius = tok(s.borderRadius);
  if (s.borderWidth !== undefined) css.borderWidth = dim(s.borderWidth);
  if (s.borderStyle) css.borderStyle = s.borderStyle;
  if (s.borderColor !== undefined) css.borderColor = tok(s.borderColor);
  if (s.boxShadow !== undefined) css.boxShadow = tok(s.boxShadow);
  if (s.backdropBlur !== undefined) {
    const b = `blur(${s.backdropBlur}px)`;
    css.backdropFilter = b;
    (css as Record<string, unknown>).WebkitBackdropFilter = b;
  }
  if (s.objectFit) css.objectFit = s.objectFit;
  if (s.objectPosition) css.objectPosition = s.objectPosition;
  if (s.cursor) css.cursor = s.cursor;

  // --- transform ------------------------------------------------------------
  const tfm: string[] = [];
  if (s.translateX !== undefined || s.translateY !== undefined) {
    tfm.push(`translate(${dim(s.translateX ?? 0)}, ${dim(s.translateY ?? 0)})`);
  }
  if (s.rotate !== undefined) tfm.push(`rotate(${s.rotate}deg)`);
  if (s.scale !== undefined) tfm.push(`scale(${s.scale})`);
  if (tfm.length) css.transform = tfm.join(" ");
  if (s.transformOrigin) css.transformOrigin = s.transformOrigin;

  // --- typography -----------------------------------------------------------
  if (s.fontFamily !== undefined) css.fontFamily = tok(s.fontFamily);
  if (s.fontSize !== undefined) css.fontSize = tok(s.fontSize);
  if (s.fontWeight !== undefined) css.fontWeight = s.fontWeight as CSSProperties["fontWeight"];
  if (s.fontStyle) css.fontStyle = s.fontStyle;
  if (s.lineHeight !== undefined) css.lineHeight = typeof s.lineHeight === "number" ? s.lineHeight : s.lineHeight;
  if (s.letterSpacing !== undefined) css.letterSpacing = dim(s.letterSpacing);
  if (s.textAlign) css.textAlign = s.textAlign;
  if (s.textTransform) css.textTransform = s.textTransform;
  if (s.textDecoration) css.textDecoration = s.textDecoration;
  if (s.whiteSpace) css.whiteSpace = s.whiteSpace;

  // Text gradient overrides color via background-clip:text.
  if (s.textGradient) {
    css.backgroundImage = s.textGradient;
    (css as Record<string, unknown>).WebkitBackgroundClip = "text";
    css.backgroundClip = "text";
    css.color = "transparent";
    (css as Record<string, unknown>).WebkitTextFillColor = "transparent";
  } else if (s.color !== undefined) {
    css.color = tok(s.color);
  }

  // Image/video leaves should fill their box by default unless sized.
  if (node && (node.type === "image" || node.type === "video") && css.width === undefined) {
    css.width = "100%";
  }

  return css;
}
