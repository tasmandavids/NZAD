// ============================================================================
//  Root layout — the single place a tenant's brand enters the DOM.
// ============================================================================

import "./globals.css";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { resolveStudio } from "@/lib/tenant";
import { fontsForBranding } from "@/lib/fonts/google-registry";
import { getBrandingCached, brandingToCssVars, DEFAULT_BRANDING } from "@/lib/branding";
import { OluneMoonDefs } from "@/components/brand/OluneMoonDefs";
import type { CSSProperties } from "react";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  title: "Olune — Run your whole studio from one calm place",
  description:
    "The studio management system for projects, finances, and live client websites — all in real time.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const host = (await headers()).get("host");
  const studio = await resolveStudio(host);

  const branding = studio
    ? await getBrandingCached(studio.id)
    : { ...DEFAULT_BRANDING };

  const fonts = fontsForBranding(branding.fontDisplay, branding.fontBody);
  const vars = {
    ...brandingToCssVars(branding),
    "--font-display": fonts.fontDisplay,
    "--font-body": fonts.fontBody,
  } as CSSProperties;

  return (
    <html lang="en-NZ" data-base={branding.base} className={fonts.className} style={vars}>
      <body>
        <OluneMoonDefs />
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
