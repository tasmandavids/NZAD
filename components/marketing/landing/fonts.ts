// ============================================================================
//  components/marketing/landing/fonts.ts
//  Self-hosted display/body fonts for the platform marketing page only.
//  Scoped via CSS variables so tenant-branded studio sites (which pick their
//  own fonts through lib/fonts.ts) are unaffected.
// ============================================================================

import { Archivo, Bodoni_Moda } from "next/font/google";

export const bodoniModa = Bodoni_Moda({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  variable: "--font-landing-display",
  display: "swap",
});

export const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-landing-body",
  display: "swap",
});

/** Apply to the outer wrapper of the marketing landing tree. */
export const landingFontVars = `${bodoniModa.variable} ${archivo.variable}`;
