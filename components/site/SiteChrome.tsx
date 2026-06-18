// ============================================================================
//  components/site/SiteChrome.tsx
//  Public website header + multi-column footer (ported from Base44 PublicNav /
//  PublicFooter). Footer content comes from studio_branding.site_settings.
// ============================================================================

import Link from "next/link";
import type { SiteSettings } from "@/lib/types";
import type { NavLink } from "@/lib/site/queries";
import { SiteHeader } from "./SiteHeader";

export function SiteChrome({
  studioName,
  logoUrl,
  tagline,
  siteSettings,
  nav,
  children,
}: {
  studioName: string;
  logoUrl: string | null;
  tagline: string | null;
  siteSettings: SiteSettings;
  nav: NavLink[];
  children: React.ReactNode;
}) {
  const footerTagline =
    siteSettings.footerTagline ??
    tagline ??
    "Exceptional dance education. World-class training for all ages and abilities.";
  const portalLabel = siteSettings.portalLabel ?? "Portal";
  const locations = siteSettings.locations ?? [];

  return (
    <div className="flex min-h-screen flex-col bg-base text-ink">
      <SiteHeader
        studioName={studioName}
        logoUrl={logoUrl}
        nav={nav}
        portalLabel={portalLabel}
      />

      <main className="flex-1">{children}</main>

      <footer className="bg-ink text-white">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-10 px-6 py-16 md:grid-cols-4">
          <div>
            <p className="text-2xl font-light" style={{ fontFamily: "var(--font-display)" }}>
              {studioName}
            </p>
            <p className="mt-3 text-xs leading-relaxed text-white/50">{footerTagline}</p>
          </div>

          <div>
            <p className="mb-5 text-xs uppercase tracking-[0.2em] text-white/40">Navigation</p>
            {nav.map((l) => (
              <Link
                key={l.slug || "home"}
                href={l.isHome ? "/" : `/${l.slug}`}
                className="mb-2 block text-sm text-white/50 transition hover:text-white"
              >
                {l.label}
              </Link>
            ))}
          </div>

          {locations.length > 0 && (
            <div>
              <p className="mb-5 text-xs uppercase tracking-[0.2em] text-white/40">Studios</p>
              <div className="space-y-4 text-sm text-white/50">
                {locations.map((loc) => (
                  <div key={loc.name}>
                    <p className="text-xs font-medium text-white">{loc.name}</p>
                    <p>{loc.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="mb-5 text-xs uppercase tracking-[0.2em] text-white/40">Contact</p>
            <div className="space-y-2 text-sm text-white/50">
              {siteSettings.contactPhone && <p>{siteSettings.contactPhone}</p>}
              {siteSettings.contactEmail && (
                <a href={`mailto:${siteSettings.contactEmail}`} className="block hover:text-white">
                  {siteSettings.contactEmail}
                </a>
              )}
            </div>
            <Link
              href="/login"
              className="mt-6 inline-block border border-brand px-4 py-2 text-xs uppercase tracking-[0.2em] text-brand transition hover:bg-brand hover:text-white"
            >
              {portalLabel}
            </Link>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-2 border-t border-white/10 px-6 py-5 sm:flex-row">
          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} {studioName}. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            {siteSettings.regionLabel && (
              <p className="text-xs text-white/40">{siteSettings.regionLabel}</p>
            )}
            {siteSettings.showPoweredBy !== false && (
              <p className="text-xs text-white/30">
                Powered by <span className="font-semibold text-white/50">Olune</span>
              </p>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
