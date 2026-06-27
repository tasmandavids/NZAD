import { themeBaseCssVars } from "@/lib/branding";
import type { ThemeBase } from "@/lib/types";

export const PORTAL_THEME_COOKIE = "portal-theme";
export const defaultPortalTheme: ThemeBase = "light";

export function isPortalTheme(value: string | null | undefined): value is ThemeBase {
  return value === "light" || value === "dark";
}

export function portalThemeCssVars(theme: ThemeBase): Record<string, string> {
  return themeBaseCssVars(theme);
}
