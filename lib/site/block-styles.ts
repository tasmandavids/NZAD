// ============================================================================
//  lib/site/block-styles.ts — visual styling helpers for site blocks.
// ============================================================================

import type { CSSProperties } from "react";
import type { BlockProps } from "./blocks";
import { num, str } from "./props";

export function snapRotation(deg: number): number {
  const step = 15;
  return Math.round(deg / step) * step;
}

const SHADOW: Record<string, string> = {
  none: "",
  sm: "shadow-sm",
  md: "shadow-md",
  lg: "shadow-lg",
  xl: "shadow-xl",
};

const RADIUS: Record<string, string> = {
  none: "rounded-none",
  sm: "rounded-lg",
  md: "rounded-2xl",
  lg: "rounded-3xl",
  full: "rounded-full",
};

const BORDER: Record<string, string> = {
  none: "",
  hair: "border border-[--hair]",
  brand: "border-2 border-brand",
  strong: "border-2 border-ink/20",
};

const PADDING: Record<string, string> = {
  none: "p-0",
  sm: "p-2 sm:p-3",
  md: "p-4 sm:p-5",
  lg: "p-6 sm:p-8",
};

const FONT_SIZE: Record<string, string> = {
  auto: "",
  xs: "text-xs",
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
  "3xl": "text-3xl",
  "4xl": "text-4xl",
  "5xl": "text-5xl",
};

const FONT_WEIGHT: Record<string, string> = {
  auto: "",
  light: "font-light",
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
  black: "font-black",
};

const ASPECT: Record<string, string> = {
  auto: "aspect-auto min-h-[120px]",
  "16:10": "aspect-[16/10]",
  "16:9": "aspect-video",
  "4:3": "aspect-[4/3]",
  "1:1": "aspect-square",
  "3:4": "aspect-[3/4]",
};

const OBJECT_FIT: Record<string, string> = {
  cover: "object-cover",
  contain: "object-contain",
};

/** Extra inline styles for freeform block frames (rotation, fill). */
export function frameStyleExtras(props: BlockProps): CSSProperties {
  const style: CSSProperties = {};
  const rotate = num(props, "_rotate", 0);
  const flip = props._flipX === true;
  if (rotate || flip) {
    const parts: string[] = [];
    if (rotate) parts.push(`rotate(${rotate}deg)`);
    if (flip) parts.push("scaleX(-1)");
    style.transform = parts.join(" ");
  }

  switch (str(props, "_fill", "none")) {
    case "surface":
      style.background = "var(--surface)";
      break;
    case "tint":
      style.background = "color-mix(in srgb, var(--brand) 10%, var(--base))";
      break;
    case "blur":
      style.background = "color-mix(in srgb, var(--surface) 85%, transparent)";
      style.backdropFilter = "blur(10px)";
      break;
    case "brand":
      style.background = "color-mix(in srgb, var(--brand) 15%, var(--base))";
      break;
    default:
      break;
  }
  return style;
}

/** Tailwind classes for frame shadow, radius, border. */
export function frameClassExtras(props: BlockProps): string {
  const shadow = SHADOW[str(props, "_shadow", "none")] ?? "";
  const radius = RADIUS[str(props, "_radius", "none")] ?? "";
  const border = BORDER[str(props, "_border", "none")] ?? "";
  return [shadow, radius, border].filter(Boolean).join(" ");
}

export function framePaddingClass(props: BlockProps): string {
  return PADDING[str(props, "_padding", "none")] ?? "p-0";
}

/** Text color from preset or custom hex. */
export function textColorStyle(props: BlockProps): CSSProperties {
  if (str(props, "textColor", "default") === "custom") {
    const hex = str(props, "customColor");
    if (hex) return { color: hex };
  }
  return {};
}

export function textColorClass(props: BlockProps): string {
  switch (str(props, "textColor", "default")) {
    case "brand":
      return "text-brand";
    case "muted":
      return "text-muted";
    case "ink":
      return "text-ink";
    case "white":
      return "text-white";
    case "custom":
      return "";
    default:
      return "text-ink";
  }
}

export function typographyClasses(props: BlockProps): string {
  const size = FONT_SIZE[str(props, "fontSize", "auto")] ?? "";
  const weight = FONT_WEIGHT[str(props, "fontWeight", "auto")] ?? "";
  return [size, weight, textColorClass(props)].filter(Boolean).join(" ");
}

export function imageFrameClasses(props: BlockProps): string {
  const aspect = ASPECT[str(props, "aspectRatio", "16:10")] ?? ASPECT["16:10"];
  const radius = RADIUS[str(props, "imageRadius", "md")] ?? RADIUS.md;
  const border = BORDER[str(props, "imageBorder", "hair")] ?? BORDER.hair;
  return `relative w-full overflow-hidden ${aspect} ${radius} ${border}`;
}

export function imageFitClass(props: BlockProps): string {
  return OBJECT_FIT[str(props, "objectFit", "cover")] ?? OBJECT_FIT.cover;
}

/** Horizontal align on the 12-column canvas. */
export function canvasAlignX(widthPct: number, align: "left" | "center" | "right"): number {
  if (align === "left") return 0;
  if (align === "right") return Math.max(0, 100 - widthPct);
  return Math.max(0, (100 - widthPct) / 2);
}
