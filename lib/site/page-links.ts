// ============================================================================
//  lib/site/page-links.ts — internal page links for the link picker + site nav.
// ============================================================================

import type { NavLink } from "@/lib/site/queries";

export type SitePageLink = {
  id: string;
  title: string;
  slug: string;
  isHome: boolean;
  href: string;
  label: string;
};

export function toPageLink(row: {
  id: string;
  title: string;
  slug: string;
  is_home: boolean;
  nav_label?: string | null;
}): SitePageLink {
  const isHome = row.is_home;
  const href = isHome ? "/" : `/${row.slug}`;
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    isHome,
    href,
    label: row.nav_label?.trim() || row.title || (isHome ? "Home" : row.slug),
  };
}

/** Common app routes studios may link to. */
export const APP_LINKS: SitePageLink[] = [
  { id: "app-enrol", title: "Enrol", slug: "enrol", isHome: false, href: "/enrol", label: "Enrol / sign up" },
  { id: "app-portal", title: "Portal", slug: "portal", isHome: false, href: "/portal", label: "Member portal" },
  { id: "app-classes", title: "Classes", slug: "classes", isHome: false, href: "/classes", label: "Classes (if published)" },
];

export function mergePageLinks(pages: SitePageLink[]): SitePageLink[] {
  const seen = new Set(pages.map((p) => p.href));
  const extras = APP_LINKS.filter((a) => !seen.has(a.href));
  return [...pages, ...extras];
}

/** Studio page row used to build header navigation (editor + public). */
export type StudioPageNavSource = {
  id: string;
  title: string;
  slug: string;
  isHome: boolean;
  showInNav: boolean;
  navLabel?: string | null;
  navOrder: number;
};

export function toStudioPageNavSource(row: {
  id: string;
  title: string;
  slug: string;
  is_home: boolean;
  show_in_nav: boolean;
  nav_label?: string | null;
  nav_order?: number | null;
}): StudioPageNavSource {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    isHome: row.is_home,
    showInNav: row.show_in_nav,
    navLabel: row.nav_label,
    navOrder: row.nav_order ?? 0,
  };
}

/** Nav links for pages flagged “show in navigation”, home first then nav order. */
export function buildStudioNavLinks(pages: StudioPageNavSource[]): NavLink[] {
  return pages
    .filter((p) => p.showInNav)
    .sort((a, b) => {
      if (a.isHome !== b.isHome) return a.isHome ? -1 : 1;
      return a.navOrder - b.navOrder;
    })
    .map((p) => ({
      slug: p.isHome ? "" : p.slug,
      label: p.navLabel?.trim() || p.title || (p.isHome ? "Home" : p.slug),
      isHome: p.isHome,
    }));
}

/** Setup wizard preview — pages that will appear in the menu once generated. */
export function buildSetupNavLinks(
  pages: Array<{ title: string; slug: string; isHome: boolean; showInNav: boolean; navLabel?: string | null }>,
): NavLink[] {
  return buildStudioNavLinks(
    pages.map((p, i) => ({
      id: p.slug,
      title: p.title,
      slug: p.slug,
      isHome: p.isHome,
      showInNav: p.showInNav,
      navLabel: p.navLabel,
      navOrder: i,
    })),
  );
}
