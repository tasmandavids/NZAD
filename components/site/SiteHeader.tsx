"use client";

import { useState } from "react";
import Link from "next/link";
import type { NavLink } from "@/lib/site/queries";
import { OluneMark } from "@/components/brand/OluneLogo";

export function SiteHeader({
  studioName,
  logoUrl,
  nav,
  portalLabel,
}: {
  studioName: string;
  logoUrl: string | null;
  nav: NavLink[];
  portalLabel: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[--hair] bg-base/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={studioName} className="h-8 w-auto" />
          ) : (
            <span
              className="text-xl font-light tracking-tight text-ink"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {studioName}
            </span>
          )}
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {nav.map((l) => (
            <Link
              key={l.slug || "home"}
              href={l.isHome ? "/" : `/${l.slug}`}
              className="text-[0.65rem] font-medium uppercase tracking-[0.2em] text-muted transition hover:text-ink"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/login"
            className="border border-ink px-4 py-2 text-[0.65rem] font-medium uppercase tracking-[0.2em] text-ink transition hover:bg-ink hover:text-base"
          >
            {portalLabel}
          </Link>
          <span title="Powered by Olune" aria-label="Powered by Olune">
            <OluneMark className="h-7 w-7 opacity-80" />
          </span>
        </nav>

        <button
          type="button"
          className="lg:hidden text-ink"
          aria-label={open ? "Close menu" : "Open menu"}
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
            <Link
              key={l.slug || "home"}
              href={l.isHome ? "/" : `/${l.slug}`}
              className="block border-b border-[--hair] px-6 py-4 text-sm text-muted transition hover:text-ink"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/login"
            className="block px-6 py-4 text-sm font-medium text-brand"
            onClick={() => setOpen(false)}
          >
            {portalLabel} →
          </Link>
        </nav>
      )}
    </header>
  );
}
