// ============================================================================
//  Root layout — the single place a tenant's brand enters the DOM.
//  Resolve studio from host → read branding → inject CSS custom properties on
//  <html>. Every Tailwind token (bg-brand, text-brand-hot, …) maps to these
//  vars in globals.css, so the whole tree follows the tenant automatically.
// ============================================================================

import "./globals.css";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { resolveStudio } from "@/lib/tenant";
import { createPublicClient } from "@/lib/supabase/public";
import { googleFontsStylesheetUrl } from "@/lib/fonts";
import { getBranding, brandingToCssVars, DEFAULT_BRANDING } from "@/lib/branding";
import { OluneMoonDefs } from "@/components/brand/OluneMoonDefs";
import type { CSSProperties } from "react";

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

  const supabase = createPublicClient();
  const branding = studio
    ? await getBranding(supabase, studio.id)
    : { ...DEFAULT_BRANDING };

  const vars = brandingToCssVars(branding) as CSSProperties;
  const fontsUrl = googleFontsStylesheetUrl(branding.fontDisplay, branding.fontBody);

  return (
    <html lang="en-NZ" data-base={branding.base} style={vars}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {fontsUrl && <link href={fontsUrl} rel="stylesheet" />}
      </head>
      <body>
        <OluneMoonDefs />
        {children}
      </body>
    </html>
  );
}
