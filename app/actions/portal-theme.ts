"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  isPortalTheme,
  PORTAL_THEME_COOKIE,
} from "@/lib/portal/theme";
import type { ThemeBase } from "@/lib/types";

const ONE_YEAR = 60 * 60 * 24 * 365;

export async function setPortalTheme(theme: ThemeBase) {
  if (!isPortalTheme(theme)) return;

  const cookieStore = await cookies();
  cookieStore.set(PORTAL_THEME_COOKIE, theme, {
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
  });

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase.from("profiles").update({ portal_theme: theme }).eq("id", user.id);
    }
  } catch {
    /* cookie alone is enough */
  }

  revalidatePath("/portal", "layout");
}
