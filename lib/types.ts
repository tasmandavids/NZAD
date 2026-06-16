// Shared domain types for the tenant + branding backbone.

export type Role = "admin" | "teacher" | "parent" | "student";
export type ThemeBase = "dark" | "light";

export interface Studio {
  id: string;
  name: string;
  slug: string;
  customDomain: string | null;
  status: string;
}

export interface Branding {
  studioId: string;
  tagline: string | null;
  logoUrl: string | null;
  brandColor: string; // the single colour an admin picks; the rest is derived
  base: ThemeBase;
  fontDisplay: string;
  fontBody: string;
}

export interface Palette {
  brand: string;
  brandHot: string;
  brandDeep: string;
}
