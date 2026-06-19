"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { NavLink } from "@/lib/site/queries";
import { OluneMark } from "@/components/brand/OluneLogo";
import { OptimizableImage } from "@/components/ui/OptimizableImage";
import { SiteNavLink } from "./SiteNavLink";

function StudioLogo({ logoUrl, studioName }: { logoUrl: string; studioName: string }) {
  return (
    <OptimizableImage
      src={logoUrl}
      alt={studioName}
      width={160}
      height={32}
      className="h-8 w-auto"
    />
  );
}

export function SiteHeader({
  studioName,
  logoUrl,
  nav,
  portalLabel,
  resolveHref,
  homeHref = "/",
  preview = false,
}: {
  studioName: string;
  logoUrl: string | null;
  nav: NavLink[];
  portalLabel: string;
  /** Override link targets (e.g. editor routes between pages). */
  resolveHref?: (link: NavLink) => string;
  homeHref?: string;
  /** Non-interactive preview chrome (setup wizard). */
  preview?: boolean;
}) {
  const t = useTranslations("site.public");
  const tBrand = useTranslations("site.brand");
  const [open, setOpen] = useState(false);

  const hrefFor = (link: NavLink) =>
    resolveHref ? resolveHref(link) : link.isHome ? "/" : `/${link.slug}`;

  const NavAnchor = preview
    ? ({ link, className, onClick }: { link: NavLink; className: string; onClick?: () => void }) => (
        <span className={className}>{link.label}</span>
      )
    : ({ link, className, onClick }: { link: NavLink; className: string; onClick?: () => void }) => (
        <SiteNavLink href={hrefFor(link)} className={className} onClick={onClick}>
          {link.label}
        </SiteNavLink>
      );

  return (
    <header className="sticky top-0 z-40 border-b border-[--hair] bg-base/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
        {preview ? (
          <span className="flex items-center gap-2">
            {logoUrl ? (
              <StudioLogo logoUrl={logoUrl} studioName={studioName} />
            ) : (
              <span
                className="text-xl font-light tracking-tight text-ink"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {studioName}
              </span>
            )}
          </span>
        ) : (
          <SiteNavLink href={homeHref} className="flex items-center gap-2" onClick={() => setOpen(false)}>
            {logoUrl ? (
              <StudioLogo logoUrl={logoUrl} studioName={studioName} />
            ) : (
              <span
                className="text-xl font-light tracking-tight text-ink"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {studioName}
              </span>
            )}
          </SiteNavLink>
        )}

        <nav className="hidden items-center gap-6 lg:flex">
          {nav.map((l) => (
            <NavAnchor
              key={l.slug || "home"}
              link={l}
              className="text-[0.65rem] font-medium uppercase tracking-[0.2em] text-muted transition hover:text-ink"
            />
          ))}
          <SiteNavLink
            href="/login"
            className="border border-ink px-4 py-2 text-[0.65rem] font-medium uppercase tracking-[0.2em] text-ink transition hover:bg-ink hover:text-base"
          >
            {portalLabel}
          </SiteNavLink>
          <span title={tBrand("poweredByOlune")} aria-label={tBrand("poweredByOlune")}>
            <OluneMark className="h-7 w-7 opacity-80" />
          </span>
        </nav>

        <button
          type="button"
          className="lg:hidden text-ink"
          aria-label={open ? t("closeMenu") : t("openMenu")}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {open && (
        <nav className="border-t border-[--hair] bg-base lg:hidden">
          {nav.map((l) => (
            <NavAnchor
              key={l.slug || "home"}
              link={l}
              className="block border-b border-[--hair] px-6 py-4 text-sm text-muted transition hover:text-ink"
              onClick={() => setOpen(false)}
            />
          ))}
          <SiteNavLink
            href="/login"
            className="block px-6 py-4 text-sm font-medium text-brand"
            onClick={() => setOpen(false)}
          >
            {t("portalArrow", { label: portalLabel })}
          </SiteNavLink>
        </nav>
      )}
    </header>
  );
}
