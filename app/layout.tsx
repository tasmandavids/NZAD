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
import { createClient } from "@/lib/supabase/server";
import { getBranding, brandingToCssVars, DEFAULT_BRANDING } from "@/lib/branding";
import type { CSSProperties } from "react";

export const metadata: Metadata = {
  title: "Olune",
  description: "The studio platform that wears your brand.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const host = (await headers()).get("host");
  const studio = await resolveStudio(host);

  const supabase = await createClient();
  const branding = studio
    ? await getBranding(supabase, studio.id)
    : { ...DEFAULT_BRANDING };

  const vars = brandingToCssVars(branding) as CSSProperties;

  return (
    <html lang="en-NZ" data-base={branding.base} style={vars}>
      <head>
        {/* Default brand fonts — Fraunces (display/serif) + Hanken Grotesk (body/UI).
            Loaded by name so a studio can swap via its branding row without a code change. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;1,9..144,300;1,9..144,400;1,9..144,500&family=Hanken+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
