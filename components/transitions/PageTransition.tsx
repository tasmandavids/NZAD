"use client";

// ============================================================================
//  PageTransition — a red/black "curtain wipe" that plays on every navigation.
//
//  App Router note: route changes don't give us a clean exit hook for the OLD
//  page, so the bulletproof pattern is a REVEAL wipe driven by `template.tsx`
//  (which re-mounts on every navigation). The new page mounts beneath full-
//  screen slats that immediately sweep away — ultra-fast, no flespecs, works
//  every time. (For a true cover→reveal across the click, layer in
//  `next-view-transitions`; this stays pure Framer Motion.)
// ============================================================================

import { motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";

const EASE = [0.16, 1, 0.3, 1] as const;
const SLATS = 5;

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  return (
    <div className="relative">
      {/* Keep content visible without JS — only animate when motion is allowed */}
      <motion.main
        key={pathname}
        initial={false}
        animate={reduce ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE, delay: 0.32 }}
      >
        {children}
      </motion.main>

      {!reduce && <CurtainReveal />}
    </div>
  );
}

function CurtainReveal() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[60] flex">
      {Array.from({ length: SLATS }).map((_, i) => (
        <motion.div
          key={i}
          className="h-full flex-1"
          style={{
            background: i % 2 ? "var(--brand)" : "var(--base)",
            transformOrigin: "top",
          }}
          initial={{ scaleY: 1 }}
          animate={{ scaleY: 0 }}
          transition={{ duration: 0.55, ease: EASE, delay: i * 0.05 }}
        />
      ))}
    </div>
  );
}
