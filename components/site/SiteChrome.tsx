// ============================================================================
//  components/site/SiteChrome.tsx
//  Public website header + multi-column footer (ported from Base44 PublicNav /
//  PublicFooter). Footer content comes from studio_branding.site_settings.
// ============================================================================

import { getTranslations } from "@/lib/i18n/server";
import type { SiteSettings } from "@/lib/types";
import type { NavLink } from "@/lib/site/queries";
import { PoweredByOlune } from "@/components/brand/PoweredByOlune";
import { SiteHeader } from "./SiteHeader";
import { SiteNavLink } from "./SiteNavLink";

export async function SiteChrome({
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
  const t = await getTranslations("site.public");
  const footerTagline =
    siteSettings.footerTagline ??
    tagline ??
    t("defaultFooterTagline");
  const portalLabel = siteSettings.portalLabel ?? t("defaultPortalLabel");
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

      <footer className="border-t border-[--hair] bg-surface text-ink">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-10 px-6 py-16 md:grid-cols-4">
          <div>
            <p className="text-2xl font-light" style={{ fontFamily: "var(--font-display)" }}>
              {studioName}
            </p>
            <p className="mt-3 text-xs leading-relaxed text-muted">{footerTagline}</p>
          </div>

          <div>
            <p className="mb-5 text-xs uppercase tracking-[0.2em] text-muted">{t("navigation")}</p>
            {nav.map((l) => (
              <SiteNavLink
                key={l.slug || "home"}
                href={l.isHome ? "/" : `/${l.slug}`}
                className="mb-2 block text-sm text-slate transition hover:text-ink"
              >
                {l.label}
              </SiteNavLink>
            ))}
          </div>

          {locations.length > 0 && (
            <div>
              <p className="mb-5 text-xs uppercase tracking-[0.2em] text-muted">{t("studios")}</p>
              <div className="space-y-4 text-sm text-slate">
                {locations.map((loc) => (
                  <div key={loc.name}>
                    <p className="text-xs font-medium text-ink">{loc.name}</p>
                    <p>{loc.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="mb-5 text-xs uppercase tracking-[0.2em] text-muted">{t("contact")}</p>
            <div className="space-y-2 text-sm text-slate">
              {siteSettings.contactPhone && <p>{siteSettings.contactPhone}</p>}
              {siteSettings.contactEmail && (
                <a href={`mailto:${siteSettings.contactEmail}`} className="block transition hover:text-ink">
                  {siteSettings.contactEmail}
                </a>
              )}
            </div>
            <SiteNavLink
              href="/login"
              className="mt-6 inline-block border border-ink px-4 py-2 text-xs uppercase tracking-[0.2em] text-ink transition hover:bg-ink hover:text-base"
            >
              {portalLabel}
            </SiteNavLink>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-2 border-t border-[--hair] px-6 py-5 sm:flex-row">
          <p className="text-xs text-muted">
            {t("copyright", { year: new Date().getFullYear(), studio: studioName })}
          </p>
          <div className="flex items-center gap-4">
            {siteSettings.regionLabel && (
              <p className="text-xs text-muted">{siteSettings.regionLabel}</p>
            )}
            {siteSettings.showPoweredBy !== false && (
              <PoweredByOlune />
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
