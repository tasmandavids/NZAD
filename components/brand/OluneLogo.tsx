"use client";

import { useId, type ComponentPropsWithoutRef } from "react";

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
  id,
  glow = false,
  className = "",
}: {
  id: string;
  glow?: boolean;
  className?: string;
}) {
  const gradId = `${id}-moonGrad`;
  const glowId = `${id}-moonGlow`;
  const clipId = `${id}-moonClip`;

  return (
    <svg
      viewBox="0 0 100 100"
      className={`block shrink-0 ${className}`}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0.28" y1="0.05" x2="0.72" y2="1">
          <stop offset="0" stopColor="#DCD9FA" />
          <stop offset="0.5" stopColor="#A6A2E8" />
          <stop offset="1" stopColor="#7A75D6" />
        </linearGradient>
        {glow && (
          <radialGradient id={glowId} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#7B77D6" stopOpacity="0.5" />
            <stop offset="0.6" stopColor="#7B77D6" stopOpacity="0.1" />
            <stop offset="1" stopColor="#7B77D6" stopOpacity="0" />
          </radialGradient>
        )}
        <clipPath id={clipId}>
          <circle cx="50" cy="50" r="33" />
        </clipPath>
      </defs>
      {glow && <circle cx="50" cy="50" r="49" fill={`url(#${glowId})`} />}
      <g clipPath={`url(#${clipId})`}>
        <rect x="16" y="16" width="68" height="68" fill={`url(#${gradId})`} />
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
  label = "Olune",
  className = "",
  ...rest
}: OluneLogoProps) {
  const uid = useId();
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
          id={uid}
          glow={glow}
          className={cfg.moon}
        />
        <span className="sr-only">{label}</span>
      </span>
    );
  }

  if (variant === "signature") {
    return (
      <span
        className={`inline-flex items-baseline ${textColor} ${className}`}
        aria-label={label}
        {...rest}
      >
        <OluneMoon
          id={uid}
          glow={glow}
          className={`${cfg.moon} translate-y-[0.08em]`}
        />
        <Wordmark className={cfg.word}>lune</Wordmark>
      </span>
    );
  }

  if (variant === "stacked") {
    const moon = (
      <OluneMoon id={uid} glow={glow} className={cfg.stackMoon ?? cfg.moon} />
    );
    return (
      <span
        className={`inline-flex flex-col items-center ${cfg.gap} ${textColor} ${className}`}
        aria-label={label}
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
      aria-label={label}
      {...rest}
    >
      <OluneMoon id={uid} glow={glow} className={cfg.moon} />
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
  const uid = useId();
  return (
    <span className={`inline-flex ${className}`} aria-hidden>
      <OluneMoon id={uid} glow={glow} className="h-full w-full" />
    </span>
  );
}
