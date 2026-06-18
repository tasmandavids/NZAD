"use client";

import { OluneLogo } from "./OluneLogo";

type Size = "xs" | "sm" | "md" | "lg" | "xl" | "hero";
type Variant = "horizontal" | "stacked" | "mark" | "signature";
type Theme = "light" | "dark";

type PoweredByOluneProps = {
  showLabel?: boolean;
  size?: Size;
  theme?: Theme;
  variant?: Variant;
  className?: string;
};

/** “Powered by” lockup — footer, portal sidebar, and standalone pages. */
export function PoweredByOlune({
  showLabel = true,
  size = "xs",
  theme = "light",
  variant = "horizontal",
  className = "",
}: PoweredByOluneProps) {
  return (
    <span className={`inline-flex flex-wrap items-center gap-x-2 gap-y-1 ${className}`}>
      {showLabel && (
        <span className="text-[0.62rem] font-medium uppercase tracking-[0.18em] text-muted">
          Powered by
        </span>
      )}
      <OluneLogo variant={variant} size={size} theme={theme} />
    </span>
  );
}
