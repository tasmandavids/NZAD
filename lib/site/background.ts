// ============================================================================
//  lib/site/background.ts — page canvas background for the freeform site builder.
// ============================================================================

import type { CSSProperties } from "react";
import { bool, num, str } from "./props";
import type { BlockProps } from "./blocks";

export type BackgroundKind = "base" | "surface" | "tint" | "brand" | "image" | "video";

export type PageBackground = {
  kind: BackgroundKind;
  imageUrl?: string;
  videoUrl?: string;
  videoAutoplay?: boolean;
  opacity?: number;
};

export const DEFAULT_PAGE_BACKGROUND: PageBackground = { kind: "base", opacity: 100 };

export const BACKGROUND_KIND_OPTIONS: Array<{ value: BackgroundKind; label: string }> = [
  { value: "base", label: "Page colour" },
  { value: "surface", label: "Surface / card" },
  { value: "tint", label: "Brand tint" },
  { value: "brand", label: "Brand gradient" },
  { value: "image", label: "Image" },
  { value: "video", label: "Video" },
];

export function normalizePageBackground(raw: unknown): PageBackground {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_PAGE_BACKGROUND };
  const o = raw as Record<string, unknown>;
  const kind = typeof o.kind === "string" ? o.kind : "base";
  const valid = BACKGROUND_KIND_OPTIONS.some((k) => k.value === kind);
  return {
    kind: (valid ? kind : "base") as BackgroundKind,
    imageUrl: typeof o.imageUrl === "string" ? o.imageUrl : "",
    videoUrl: typeof o.videoUrl === "string" ? o.videoUrl : "",
    videoAutoplay: o.videoAutoplay === true,
    opacity: typeof o.opacity === "number" ? o.opacity : 100,
  };
}

export function backgroundOpacity(bg: PageBackground): number {
  const v = bg.opacity ?? 100;
  return Math.min(100, Math.max(0, v)) / 100;
}

/** Inline styles for the full-page background layer. */
export function backgroundShellStyle(bg: PageBackground): CSSProperties {
  const opacity = backgroundOpacity(bg);
  switch (bg.kind) {
    case "surface":
      return { background: "var(--surface)", opacity };
    case "tint":
      return { background: "color-mix(in srgb, var(--brand) 12%, var(--base))", opacity };
    case "brand":
      return {
        background: "linear-gradient(145deg, var(--brand), var(--brand-deep))",
        opacity,
      };
    case "image":
      return bg.imageUrl
        ? {
            backgroundImage: `url(${bg.imageUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity,
          }
        : { background: "var(--base)", opacity };
    case "video":
      return { background: "var(--base)", opacity: 1 };
    default:
      return { background: "var(--base)", opacity };
  }
}

/** Loose props helper for legacy reads. */
export function backgroundFromProps(p: BlockProps): PageBackground {
  return normalizePageBackground({
    kind: str(p, "kind", "base"),
    imageUrl: str(p, "imageUrl"),
    videoUrl: str(p, "videoUrl"),
    videoAutoplay: bool(p, "videoAutoplay"),
    opacity: num(p, "opacity", 100),
  });
}
