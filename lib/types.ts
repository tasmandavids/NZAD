// Shared domain types for the tenant + branding backbone.

export type Role = "admin" | "teacher" | "office" | "parent" | "student";
export type ThemeBase = "dark" | "light";

export interface Studio {
  id: string;
  name: string;
  slug: string;
  customDomain: string | null;
  status: string;
}

export type SiteLocation = {
  name: string;
  detail: string;
};

/** Footer / chrome settings stored in studio_branding.site_settings. */
export type SiteSettings = {
  footerTagline?: string;
  showPoweredBy?: boolean;
  portalLabel?: string;
  contactEmail?: string;
  contactPhone?: string;
  regionLabel?: string;
  locations?: SiteLocation[];
};

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  showPoweredBy: true,
  portalLabel: "Portal",
  locations: [],
};

export interface Branding {
  studioId: string;
  tagline: string | null;
  logoUrl: string | null;
  brandColor: string; // the single colour an admin picks; the rest is derived
  base: ThemeBase;
  fontDisplay: string;
  fontBody: string;
  siteSettings: SiteSettings;
}

export interface Palette {
  brand: string;
  brandHot: string;
  brandDeep: string;
}
