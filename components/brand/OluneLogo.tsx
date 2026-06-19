"use client";

import { useTranslations } from "next-intl";
import type { ComponentPropsWithoutRef } from "react";
import {
  OLUNE_MOON_CLIP_ID,
  OLUNE_MOON_GLOW_ID,
  OLUNE_MOON_GRAD_ID,
} from "./OluneMoonDefs";

type Size = "xs" | "sm" | "md" | "lg" | "xl" | "hero";
type Variant = "horizontal" | "stacked" | "mark" | "signature";
type Theme = "light" | "dark";

type OluneLogoProps = ComponentPropsWithoutRef<"span"> & {
  variant?: Variant;
  theme?: Theme;
  size?: Size;
  /** Subtle float animation for hero moon marks */
  animated?: boolean;
  /** Accessible label — defaults to "Olune" for lockups, hidden for decorative marks */
  label?: string;
};

const sizeConfig: Record<
  Size,
  { moon: string; word: string; gap: string; stackMoon?: string }
> = {
  xs: {
    moon: "h-[1.1em] w-[1.1em]",
    word: "text-base",
    gap: "gap-[0.35em]",
    stackMoon: "h-[1.8em] w-[1.8em]",
  },
  sm: {
    moon: "h-[1.32em] w-[1.32em]",
    word: "text-xl",
    gap: "gap-[0.42em]",
    stackMoon: "h-[2em] w-[2em]",
  },
  md: {
    moon: "h-[1.32em] w-[1.32em]",
    word: "text-2xl",
    gap: "gap-[0.42em]",
    stackMoon: "h-[2.4em] w-[2.4em]",
  },
  lg: {
    moon: "h-[1.5em] w-[1.5em]",
    word: "text-[clamp(1.75rem,3vw,2.6rem)]",
    gap: "gap-[0.42em]",
    stackMoon: "h-[2.6em] w-[2.6em]",
  },
  xl: {
    moon: "h-[1.6em] w-[1.6em]",
    word: "text-[clamp(2rem,5vw,3.4rem)]",
    gap: "gap-[0.42em]",
    stackMoon: "h-[2.8em] w-[2.8em]",
  },
  hero: {
    moon: "h-[clamp(72px,13vw,132px)] w-[clamp(72px,13vw,132px)]",
    word: "text-[clamp(2.2rem,6vw,4rem)]",
    gap: "gap-3",
    stackMoon: "h-[clamp(88px,16vw,160px)] w-[clamp(88px,16vw,160px)]",
  },
};

function OluneMoon({
  glow = false,
  className = "",
}: {
  glow?: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={`block shrink-0 ${className}`}
      aria-hidden
    >
      {glow && (
        <circle cx="50" cy="50" r="49" fill={`url(#${OLUNE_MOON_GLOW_ID})`} />
      )}
      <g clipPath={`url(#${OLUNE_MOON_CLIP_ID})`}>
        <rect
          x="16"
          y="16"
          width="68"
          height="68"
          fill={`url(#${OLUNE_MOON_GRAD_ID})`}
        />
        <circle cx="38.5" cy="41" r="33" fill="#1B1A38" />
      </g>
    </svg>
  );
}

function Wordmark({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`font-display font-normal lowercase leading-none tracking-[-0.015em] ${className}`}
    >
      {children}
    </span>
  );
}

/** Olune brand lockup — moon mark + wordmark from the brand guidelines. */
export function OluneLogo({
  variant = "horizontal",
  theme = "light",
  size = "md",
  animated = false,
  label,
  className = "",
  ...rest
}: OluneLogoProps) {
  const t = useTranslations("site.brand");
  const accessibleLabel = label ?? t("logoLabel");
  const cfg = sizeConfig[size];
  const glow = theme === "dark";
  const textColor = theme === "dark" ? "text-paper" : "text-ink-black";

  if (variant === "mark") {
    return (
      <span
        className={`inline-flex ${animated ? "animate-[floatMoon_9s_ease-in-out_infinite]" : ""} ${className}`}
        {...rest}
      >
        <OluneMoon
          glow={glow}
          className={cfg.moon}
        />
        <span className="sr-only">{accessibleLabel}</span>
      </span>
    );
  }

  if (variant === "signature") {
    return (
      <span
        className={`inline-flex items-baseline ${textColor} ${className}`}
        aria-label={accessibleLabel}
        {...rest}
      >
        <OluneMoon
          glow={glow}
          className={`${cfg.moon} translate-y-[0.08em]`}
        />
        <Wordmark className={cfg.word}>lune</Wordmark>
      </span>
    );
  }

  if (variant === "stacked") {
    const moon = (
      <OluneMoon glow={glow} className={cfg.stackMoon ?? cfg.moon} />
    );
    return (
      <span
        className={`inline-flex flex-col items-center ${cfg.gap} ${textColor} ${className}`}
        aria-label={accessibleLabel}
        {...rest}
      >
        {animated ? (
          <span className="inline-flex animate-[floatMoon_9s_ease-in-out_infinite]">{moon}</span>
        ) : (
          moon
        )}
        <Wordmark className={cfg.word}>olune</Wordmark>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center ${cfg.gap} ${textColor} ${className}`}
      aria-label={accessibleLabel}
      {...rest}
    >
      <OluneMoon glow={glow} className={cfg.moon} />
      <Wordmark className={cfg.word}>olune</Wordmark>
    </span>
  );
}

/** Moon mark alone — for favicons, app tiles, and tight spaces. */
export function OluneMark({
  className = "h-8 w-8",
  glow = false,
}: {
  className?: string;
  glow?: boolean;
}) {
  return (
    <span className={`inline-flex ${className}`} aria-hidden>
      <OluneMoon glow={glow} className="h-full w-full" />
    </span>
  );
}
