"use client";

import type { ReactNode } from "react";
import { APPEARANCE_DEFAULTS, type BlockProps, type BlockType } from "./blocks";
import { str } from "./props";

const SPACING: Record<string, string> = {
  compact: "py-10 sm:py-12",
  normal: "py-16 sm:py-20",
  spacious: "py-24 sm:py-32",
};

/** Per-block background + vertical spacing wrapper used in editor and public site. */
export function BlockShell({
  p,
  type,
  className = "",
  children,
}: {
  p: BlockProps;
  type: BlockType;
  className?: string;
  children: ReactNode;
}) {
  const def = APPEARANCE_DEFAULTS[type] ?? { _bg: "base", _spacing: "normal" };
  const bg = str(p, "_bg", def._bg);
  const spacing = str(p, "_spacing", def._spacing);
  const bgClass = bg === "surface" ? "bg-surface" : "";
  const style =
    bg === "tint" ? { background: "color-mix(in srgb, var(--brand) 8%, var(--base))" } : undefined;
  return (
    <section className={`px-6 ${SPACING[spacing] ?? SPACING.normal} ${bgClass} ${className}`.trim()} style={style}>
      {children}
    </section>
  );
}

export const BLOCK_WRAP = "mx-auto w-full max-w-5xl";
