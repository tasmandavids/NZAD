// ============================================================================
//  Root layout — the single place a tenant's brand enters the DOM.
// ============================================================================

import "./globals.css";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { getTranslations } from "@/lib/i18n/server";
import { resolveStudio } from "@/lib/tenant";
import { fontsForBranding } from "@/lib/fonts/google-registry";
import { getBrandingCached, brandingToCssVars, DEFAULT_BRANDING } from "@/lib/branding";
import { OluneMoonDefs } from "@/components/brand/OluneMoonDefs";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { CSSProperties } from "react";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [host, locale, messages] = await Promise.all([
    headers().then((h) => h.get("host")),
    getLocale(),
    getMessages(),
  ]);
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
    <html lang={locale} data-base={branding.base} className={fonts.className} style={vars}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <OluneMoonDefs />
          {children}
          <SpeedInsights />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
