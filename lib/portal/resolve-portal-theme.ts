import "server-only";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  defaultPortalTheme,
  isPortalTheme,
  PORTAL_THEME_COOKIE,
} from "@/lib/portal/theme";
import type { ThemeBase } from "@/lib/types";

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
