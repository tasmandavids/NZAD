import { describe, it, expect } from "vitest";
import {
  DEFAULT_BRANDING,
  derivePalette,
  brandingToCssVars,
  getBranding,
} from "@/lib/branding";
import { makeSupabaseMock } from "./helpers/supabaseMock";

describe("derivePalette", () => {
  it("keeps the brand colour as-is and derives hot/deep shades", () => {
    const p = derivePalette("#6B66C9");
    expect(p.brand).toBe("#6B66C9");
    expect(p.brandHot).toMatch(/^hsl\(/);
    expect(p.brandDeep).toMatch(/^hsl\(/);
    // hot and deep are distinct derived shades.
    expect(p.brandHot).not.toBe(p.brandDeep);
  });

  it("clamps lightness so a near-white brand still yields a usable deep shade", () => {
    const p = derivePalette("#FFFFFF");
    // deep lightness is clamped to >= 10%, so it must not be 0% or negative.
    const lightness = Number(p.brandDeep.match(/(\d+)%\)$/)?.[1]);
    expect(lightness).toBeGreaterThanOrEqual(10);
  });
});

describe("brandingToCssVars", () => {
  it("emits the full set of CSS custom properties", () => {
    const vars = brandingToCssVars(DEFAULT_BRANDING);
    expect(vars["--brand"]).toBe(DEFAULT_BRANDING.brandColor);
    expect(vars["--base"]).toBeDefined();
    expect(vars["--surface"]).toBeDefined();
    expect(vars["--font-display"]).toContain(DEFAULT_BRANDING.fontDisplay);
    expect(vars["--font-body"]).toContain(DEFAULT_BRANDING.fontBody);
  });

  it("light and dark bases produce different surfaces", () => {
    const dark = brandingToCssVars({ ...DEFAULT_BRANDING, base: "dark" });
    const light = brandingToCssVars({ ...DEFAULT_BRANDING, base: "light" });
    expect(dark["--base"]).not.toBe(light["--base"]);
  });
});

describe("getBranding", () => {
  it("falls back to defaults when the studio has no branding row", async () => {
    const supabase = makeSupabaseMock({
      studio_branding: { single: { data: null } },
    });
    const b = await getBranding(supabase, "studio-1");
    expect(b.studioId).toBe("studio-1");
    expect(b.brandColor).toBe(DEFAULT_BRANDING.brandColor);
  });

  it("maps DB snake_case columns onto the Branding shape", async () => {
    const supabase = makeSupabaseMock({
      studio_branding: {
        single: {
          data: {
            tagline: "Move with us",
            logo_url: "https://x/logo.png",
            brand_color: "#112233",
            base: "light",
            font_display: "Fraunces",
            font_body: "Inter",
          },
        },
      },
    });
    const b = await getBranding(supabase, "studio-2");
    expect(b.brandColor).toBe("#112233");
    expect(b.logoUrl).toBe("https://x/logo.png");
    expect(b.base).toBe("light");
    expect(b.fontBody).toBe("Inter");
  });
});
