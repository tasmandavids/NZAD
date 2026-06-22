// ============================================================================
//  components/builder/AnimatedShell.tsx — framer-motion render layer (pillar 6).
//
//  Renders a node's element as a motion component so entrance / scroll / hover
//  animations apply to the node ITSELF (no extra wrapper that would disrupt the
//  flex/grid layout). Only used outside the editor (preview / published).
// ============================================================================

"use client";

import { createElement, type CSSProperties, type ElementType, type ReactNode } from "react";
import { motion, type Variants } from "framer-motion";
import type { AnimationSpec, StyleSet } from "@/lib/builder/schema";
import { compileStyle } from "@/lib/builder/cascade";

const PRESET_FROM: Record<string, Partial<StyleSet> & { x?: number; y?: number }> = {
  fade: { opacity: 0 },
  "fade-up": { opacity: 0, translateY: 24 },
  "fade-down": { opacity: 0, translateY: -24 },
  "fade-left": { opacity: 0, translateX: 24 },
  "fade-right": { opacity: 0, translateX: -24 },
  "zoom-in": { opacity: 0, scale: 0.92 },
  "zoom-out": { opacity: 0, scale: 1.08 },
  "slide-up": { translateY: 48 },
  "blur-in": { opacity: 0, backdropBlur: 8 },
};

function toMotionTarget(s: Partial<StyleSet> | undefined): Record<string, unknown> {
  if (!s) return {};
  const css = compileStyle(s as StyleSet) as Record<string, unknown>;
  // framer animates numeric transform shorthands better than the transform string.
  const out: Record<string, unknown> = { ...css };
  if (s.translateX !== undefined) out.x = s.translateX;
  if (s.translateY !== undefined) out.y = s.translateY;
  if (s.scale !== undefined) out.scale = s.scale;
  if (s.rotate !== undefined) out.rotate = s.rotate;
  delete out.transform;
  return out;
}

export function AnimatedShell({
  tag,
  style,
  className,
  anim,
  dataId,
  children,
}: {
  tag: string;
  /** Editor preview passes a resolved inline style; published output passes a className. */
  style?: CSSProperties;
  className?: string;
  anim: AnimationSpec;
  dataId: string;
  children: ReactNode;
}) {
  const from = anim.preset && anim.preset !== "custom" ? PRESET_FROM[anim.preset] : anim.from;
  const to = anim.to;
  const initial = toMotionTarget(from);
  const animateTo = { opacity: 1, x: 0, y: 0, scale: 1, ...toMotionTarget(to) };
  const transition = {
    duration: anim.duration ?? 0.6,
    delay: anim.delay ?? 0,
    ease: anim.ease ?? "easeOut",
    ...(anim.stagger ? { staggerChildren: anim.stagger } : {}),
  };

  const MotionTag: ElementType =
    (motion as unknown as Record<string, ElementType>)[tag] ?? motion.div;

  const common = { style, className, "data-builder-node": dataId, transition };

  if (anim.trigger === "hover") {
    const hoverVariants: Variants = { rest: initial.opacity !== undefined ? { opacity: 1 } : {}, hover: animateTo };
    return createElement(MotionTag, { ...common, initial: "rest", whileHover: "hover", variants: hoverVariants }, children);
  }
  if (anim.trigger === "load") {
    return createElement(MotionTag, { ...common, initial, animate: animateTo }, children);
  }
  // inview / scroll → reveal on viewport entry
  return createElement(
    MotionTag,
    { ...common, initial, whileInView: animateTo, viewport: { once: anim.once ?? true, amount: 0.3 } },
    children,
  );
}
