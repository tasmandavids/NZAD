// ============================================================================
//  lib/builder/tokens.ts — design tokens & token resolution (pillar 5)
//
//  Tokens are stored on the document as a flat ThemeTokens object. At render
//  time we emit them as CSS custom properties (`--ds-color-brand`, …) scoped to
//  the canvas / published page root. Style values that reference a token via the
//  `{group.name}` syntax are rewritten to `var(--ds-group-name)` by the cascade
//  resolver. Because the actual value lives in a CSS variable, changing a token
//  re-skins every node instantly with NO React re-render and NO layout shift —
//  the browser just recomputes the variable.
// ============================================================================

import type { CSSProperties } from "react";
import type { ThemeTokens } from "./schema";

export const DEFAULT_THEME: ThemeTokens = {
  base: "light",
  color: {
    brand: "#6B66C9",
    brandHot: "#8B5CF6",
    brandDeep: "#4338CA",
    ink: "#15151B",
    body: "#3A3A44",
    muted: "#6B6B78",
    surface: "#FFFFFF",
    surfaceAlt: "#F5F4FA",
    line: "#E6E4F0",
    base: "#FBFAFE",
    inverse: "#FFFFFF",
    success: "#16A34A",
    danger: "#DC2626",
  },
  font: {
    display: '"Fraunces", Georgia, serif',
    body: '"Inter", system-ui, -apple-system, sans-serif',
    mono: 'ui-monospace, "SF Mono", Menlo, monospace',
  },
  fontSize: {
    xs: "0.75rem",
    sm: "0.875rem",
    base: "1rem",
    lg: "1.125rem",
    xl: "1.375rem",
    "2xl": "1.75rem",
    "3xl": "2.25rem",
    "4xl": "3rem",
    "5xl": "4rem",
    "6xl": "5.25rem",
  },
  radius: {
    none: "0px",
    sm: "6px",
    md: "12px",
    lg: "20px",
    xl: "32px",
    full: "9999px",
  },
  shadow: {
    none: "none",
    sm: "0 1px 2px rgba(21,21,27,0.06)",
    md: "0 8px 24px rgba(21,21,27,0.08)",
    lg: "0 20px 48px rgba(21,21,27,0.12)",
    xl: "0 32px 80px rgba(21,21,27,0.18)",
  },
  space: {
    xs: "0.5rem",
    sm: "1rem",
    md: "1.5rem",
    lg: "2.5rem",
    xl: "4rem",
    "2xl": "6rem",
  },
};

const TOKEN_RE = /^\{([a-zA-Z0-9]+)\.([a-zA-Z0-9_-]+)\}$/;

/** Is this style value a token reference like `{color.brand}`? */
export function isTokenRef(value: unknown): value is string {
  return typeof value === "string" && TOKEN_RE.test(value);
}

/** `{color.brand}` → `--ds-color-brand`. Returns null if not a token ref. */
export function tokenToCssVar(value: string): string | null {
  const m = TOKEN_RE.exec(value);
  if (!m) return null;
  return `--ds-${m[1]}-${cssSafe(m[2])}`;
}

/** Resolve a style value: token refs → var(--ds-…), everything else passes through. */
export function resolveTokenValue(value: string): string {
  const varName = tokenToCssVar(value);
  return varName ? `var(${varName})` : value;
}

/** Look up the literal value of a token ref from a theme (for previews/swatches). */
export function lookupToken(theme: ThemeTokens, value: string): string {
  const m = TOKEN_RE.exec(value);
  if (!m) return value;
  const group = theme[m[1] as keyof ThemeTokens];
  if (group && typeof group === "object") {
    const v = (group as Record<string, string>)[m[2]];
    if (typeof v === "string") return v;
  }
  return value;
}

function cssSafe(s: string): string {
  return s.replace(/[^a-zA-Z0-9_-]/g, "-");
}

/** Build the full set of CSS custom properties for a theme. */
export function themeToCssVars(theme: ThemeTokens): Record<string, string> {
  const out: Record<string, string> = {};
  for (const group of ["color", "font", "fontSize", "radius", "shadow", "space"] as const) {
    const bag = theme[group];
    for (const [k, v] of Object.entries(bag)) {
      out[`--ds-${group.toLowerCase()}-${cssSafe(k)}`] = v;
    }
  }
  return out;
}

/** Convenience: a React style object carrying every theme variable. */
export function themeStyle(theme: ThemeTokens): CSSProperties {
  return themeToCssVars(theme) as CSSProperties;
}
