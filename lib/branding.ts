// ============================================================================
//  Branding engine — the one place colour logic lives.
//  Used by the root layout (SSR injection), the admin editor (live preview),
//  and the save action (to cache derived shades). Keep it framework-agnostic.
// ============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Branding, Palette, ThemeBase } from "./types";

export const DEFAULT_BRANDING: Branding = {
  studioId: "",
  tagline: null,
  logoUrl: null,
  brandColor: "#6B66C9",  // Iris
  base: "dark",
  fontDisplay: "Fraunces",
  fontBody: "Hanken Grotesk",
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

/** From one brand colour, derive a coherent "hot" (lighter/punchier) and
 *  "deep" (darker) shade — the same maths the admin colour-picker previews. */
export function derivePalette(brandColor: string): Palette {
  const { h, s, l } = hexToHsl(brandColor);
  const H = Math.round(h);
  return {
    brand: brandColor,
    brandHot: `hsl(${H} ${Math.round(clamp(s + 8, 0, 100))}% ${Math.round(clamp(l + 12, 0, 72))}%)`,
    brandDeep: `hsl(${H} ${Math.round(clamp(s, 0, 100))}% ${Math.round(clamp(l - 22, 10, 100))}%)`,
  };
}

/** Neutral surfaces + atmosphere knobs for each base. The cinematic overlays
 *  (spotlight glow, grain, vignette) dial themselves down in light mode. */
const BASES: Record<ThemeBase, Record<string, string>> = {
  dark: {
    // Midnight base — the night sky the brand lives on
    base: "#1B1A38", surface: "#24234A", text: "#F7F4EE", muted: "#6C6A7E",
    hair: "rgba(247,244,238,.10)", glow: ".22", vignette: ".55", grain: ".05",
  },
  light: {
    // Halo Cream base — warm daylight
    base: "#F7F4EE", surface: "#FFFFFF", text: "#1F1D30", muted: "#6C6A7E",
    hair: "rgba(31,29,48,.10)", glow: ".16", vignette: ".10", grain: ".03",
  },
};

/** The complete set of CSS custom properties for a studio — drop straight onto
 *  <html style={...}> (SSR) or any preview wrapper (admin editor). */
export function brandingToCssVars(b: Branding): Record<string, string> {
  const p = derivePalette(b.brandColor);
  const base = BASES[b.base];
  return {
    "--brand": p.brand,
    "--brand-hot": p.brandHot,
    "--brand-deep": p.brandDeep,
    "--base": base.base,
    "--surface": base.surface,
    "--text": base.text,
    "--muted": base.muted,
    "--hair": base.hair,
    "--glow": base.glow,
    "--vignette": base.vignette,
    "--grain": base.grain,
    "--font-display": `${b.fontDisplay}, system-ui, sans-serif`,
    "--font-body": `${b.fontBody}, system-ui, sans-serif`,
  };
}

/** Read a studio's branding (public-readable by RLS). Falls back to defaults
 *  so a brand-new studio still renders. */
export async function getBranding(
  supabase: SupabaseClient,
  studioId: string,
): Promise<Branding> {
  const { data } = await supabase
    .from("studio_branding")
    .select("*")
    .eq("studio_id", studioId)
    .single();

  if (!data) return { ...DEFAULT_BRANDING, studioId };

  return {
    studioId,
    tagline: data.tagline,
    logoUrl: data.logo_url,
    brandColor: data.brand_color,
    base: data.base,
    fontDisplay: data.font_display,
    fontBody: data.font_body,
  };
}
