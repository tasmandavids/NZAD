// ============================================================================
//  components/site/SiteChrome.tsx
//  Public website header (studio name/logo + nav from published pages) and
//  footer. Server component — wraps the rendered blocks on every public page.
// ============================================================================

import Link from "next/link";
import type { NavLink } from "@/lib/site/queries";

export function SiteChrome({
  studioName,
  logoUrl,
  nav,
  children,
}: {
  studioName: string;
  logoUrl: string | null;
  nav: NavLink[];
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-base text-ink">
      <header className="sticky top-0 z-40 border-b border-[--hair] bg-base/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={studioName} className="h-8 w-auto" />
            ) : (
              <span className="text-lg font-black tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                {studioName}
              </span>
            )}
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            {nav.map((l) => (
              <Link
                key={l.slug || "home"}
                href={`/${l.slug}`}
                className="rounded-full px-3 py-1.5 text-sm text-muted transition hover:bg-surface hover:text-ink"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/login"
              className="ml-1 rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-white transition hover:brightness-110"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-[--hair] bg-surface">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-muted sm:flex-row">
          <span>
            © {new Date().getFullYear()} {studioName}
          </span>
          <span className="text-xs">
            Powered by <span className="font-semibold text-ink">Olune</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
