// ============================================================================
//  components/marketing/landing/BrowserWindow.tsx
//  Presentational mac-style browser chrome used to frame the "three jobs"
//  product mockups. No state/effects — safe to render from a server tree,
//  but the pages that use it are client components already.
"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { ComponentPropsWithoutRef } from "react";

type BrowserWindowProps = ComponentPropsWithoutRef<"div"> & {
  url: string;
  children: ReactNode;
};

export function BrowserWindow({ url, children, className = "", ...rest }: BrowserWindowProps) {
  const ref = useState<HTMLDivElement | null>(null);
  const el = ref[0];
  const setEl = ref[1];
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const reduceMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (!el || reduceMotion) return;
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width;
      const ny = (e.clientY - rect.top) / rect.height;
      setTilt({ x:(1 - ny) * 14 - 7, y:(1 - nx) * 14 - 7 });
    };
    const onLeave = () => setTilt({ x: 0, y: 0 });
    el.addEventListener("mousemove", onMove, { passive: true });
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [el, reduceMotion]);

  return (
    <div
      ref={setEl}
      style={{
        transform: reduceMotion ? undefined : `perspective(1200px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        transition: "transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      {...rest}
      className={`w-full overflow-hidden rounded-2xl border border-white/10 bg-[#202124] shadow-[0_24px_80px_-24px_rgba(26,21,53,0.55)] ${className} motion-safe:transition-transform`}
    >
      <div className="flex items-center gap-3 px-3.5 pt-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
      </div>
      <div className="flex items-center gap-2 px-2 py-2">
        <div className="mx-1 flex h-[26px] flex-1 items-center gap-2 rounded-full bg-[#282a2d] px-3.5">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white/30" />
          <span className="truncate text-[11px] text-white/70">{url}</span>
        </div>
      </div>
      <div className="h-px bg-white/10" />
      <div className="bg-[#fdfcff]">{children}</div>
    </div>
  );
}
