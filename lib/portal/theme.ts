import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
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

/** Resolve the user's portal light/dark preference (cookie → profile → light default). */
export async function resolvePortalTheme(): Promise<ThemeBase> {
  const cookieStore = await cookies();
  const cookieTheme = cookieStore.get(PORTAL_THEME_COOKIE)?.value;
  if (isPortalTheme(cookieTheme)) return cookieTheme;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("portal_theme")
        .eq("id", user.id)
        .maybeSingle();

      if (isPortalTheme(profile?.portal_theme)) {
        return profile.portal_theme;
      }
    }
  } catch {
    /* unauthenticated or no session */
  }

  return defaultPortalTheme;
}