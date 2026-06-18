// ============================================================================
//  lib/site/button-styles.ts — shared button style presets for site blocks.
// ============================================================================

import type { CSSProperties } from "react";

export type ButtonStyle =
  | "solid"
  | "outline"
  | "ghost"
  | "soft"
  | "dark"
  | "gradient"
  | "square";

export const BUTTON_STYLE_OPTIONS: Array<{ value: ButtonStyle; label: string }> = [
  { value: "solid", label: "Solid" },
  { value: "outline", label: "Outline" },
  { value: "ghost", label: "Ghost" },
  { value: "soft", label: "Soft fill" },
  { value: "dark", label: "Dark" },
  { value: "gradient", label: "Gradient" },
  { value: "square", label: "Square corners" },
];

/** Button styles for CTAs on dark / gradient backgrounds. */
export const CTA_BUTTON_STYLE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "white", label: "White" },
  { value: "outline-white", label: "Outline white" },
  { value: "dark", label: "Dark" },
  { value: "ghost-white", label: "Ghost white" },
];

export function buttonStyleClasses(style: string, size: "sm" | "md" | "lg" = "md"): string {
  const pad =
    size === "sm" ? "px-5 py-2 text-xs" : size === "lg" ? "px-8 py-3.5 text-base" : "px-6 py-2.5 text-sm";
  const base = `inline-flex items-center justify-center ${pad} font-semibold transition hover:brightness-110`;
  const rounded = style === "square" ? "rounded-lg" : "rounded-full";

  switch (style) {
    case "outline":
      return `${base} ${rounded} border-2 border-brand bg-transparent text-brand hover:bg-brand/10`;
    case "ghost":
      return `${base} ${rounded} text-brand hover:bg-brand/10`;
    case "soft":
      return `${base} ${rounded} bg-brand/15 text-brand hover:bg-brand/25`;
    case "dark":
      return `${base} ${rounded} bg-ink text-paper hover:bg-brand`;
    case "gradient":
      return `${base} ${rounded} text-white shadow-md`;
    case "square":
      return `${base} rounded-lg bg-brand text-white`;
    case "solid":
    default:
      return `${base} ${rounded} bg-brand text-white`;
  }
}

export function buttonStyleInline(style: string): CSSProperties | undefined {
  if (style === "gradient") {
    return { background: "linear-gradient(135deg, var(--brand), var(--brand-deep))" };
  }
  return undefined;
}

export function ctaButtonClasses(style: string): string {
  const base =
    "mt-2 inline-flex items-center justify-center rounded-full px-7 py-3 text-sm font-semibold transition hover:brightness-110";
  switch (style) {
    case "outline-white":
      return `${base} border-2 border-white/90 bg-transparent text-white hover:bg-white/10`;
    case "dark":
      return `${base} bg-ink text-white hover:bg-ink/90`;
    case "ghost-white":
      return `${base} text-white/90 hover:bg-white/10`;
    case "white":
    default:
      return `${base} bg-white text-[color:var(--brand-deep)] hover:brightness-95`;
  }
}
