"use client";

import { useLayoutEffect } from "react";
import { portalThemeCssVars } from "@/lib/portal/theme";
import type { ThemeBase } from "@/lib/types";

export function PortalThemeSync({ theme }: { theme: ThemeBase }) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const vars = portalThemeCssVars(theme);
    for (const [key, value] of Object.entries(vars)) {
      root.style.setProperty(key, value);
    }
    root.dataset.base = theme;
  }, [theme]);

  return null;
}
