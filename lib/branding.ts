// ============================================================================
//  Branding engine — the one place colour logic lives.
//  Used by the root layout (SSR injection), the admin editor (live preview),
//  and the save action (to cache derived shades). Keep it framework-agnostic.
// ============================================================================

import { cache } from "react";
import { unstable_cache } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Branding, Palette, SiteSettings, ThemeBase } from "./types";
import { DEFAULT_SITE_SETTINGS } from "./types";
import { createPublicClient } from "./supabase/public";

export const DEFAULT_BRANDING: Branding = {
  studioId: "",
  tagline: null,
  logoUrl: null,
  brandColor: "#6B66C9",  // Iris
  base: "light",
  fontDisplay: "Fraunces",
  fontBody: "Hanken Grotesk",
  siteSettings: { ...DEFAULT_SITE_SETTINGS },
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
    // Ivory + paper — warm daylight with crisp black type
    base: "#FAF8F3", surface: "#FFFFFF", text: "#0A0A0A", muted: "#6C6A7E",
    hair: "rgba(10,10,10,.08)", glow: ".12", vignette: ".06", grain: ".02",
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

/** Parse site_settings jsonb from the DB. */
export function parseSiteSettings(raw: unknown): SiteSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SITE_SETTINGS };
  const o = raw as Record<string, unknown>;
  const locations = Array.isArray(o.locations)
    ? o.locations
        .filter((l): l is Record<string, string> => !!l && typeof l === "object")
        .map((l) => ({ name: String(l.name ?? ""), detail: String(l.detail ?? "") }))
        .filter((l) => l.name)
    : [];
  return {
    footerTagline: typeof o.footerTagline === "string" ? o.footerTagline : undefined,
    showPoweredBy: typeof o.showPoweredBy === "boolean" ? o.showPoweredBy : DEFAULT_SITE_SETTINGS.showPoweredBy,
    portalLabel: typeof o.portalLabel === "string" ? o.portalLabel : DEFAULT_SITE_SETTINGS.portalLabel,
    contactEmail: typeof o.contactEmail === "string" ? o.contactEmail : undefined,
    contactPhone: typeof o.contactPhone === "string" ? o.contactPhone : undefined,
    regionLabel: typeof o.regionLabel === "string" ? o.regionLabel : undefined,
    locations,
  };
}

export async function getBranding(
  supabase: SupabaseClient,
  studioId: string,
): Promise<Branding> {
  const { data } = await supabase
    .from("studio_branding")
    .select("tagline, logo_url, brand_color, base, font_display, font_body, site_settings")
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
    siteSettings: parseSiteSettings(data.site_settings),
  };
}

/** Request-scoped dedup for layout + page branding reads. */
export const getBrandingCached = cache(async (studioId: string): Promise<Branding> => {
  return unstable_cache(
    () => getBranding(createPublicClient(), studioId),
    ["branding", studioId],
    { tags: [`branding-${studioId}`], revalidate: 300 },
  )();
});
