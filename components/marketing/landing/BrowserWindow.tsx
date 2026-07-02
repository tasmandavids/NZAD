// ============================================================================
//  components/marketing/landing/BrowserWindow.tsx
//  Presentational mac-style browser chrome used to frame the "three jobs"
//  product mockups. No state/effects — safe to render from a server tree,
//  but the pages that use it are client components already.
// ============================================================================

import type { ReactNode } from "react";

type BrowserWindowProps = {
  url: string;
  children: ReactNode;
  className?: string;
};

export function BrowserWindow({ url, children, className = "" }: BrowserWindowProps) {
  return (
    <div
      className={`w-full overflow-hidden rounded-2xl border border-white/10 bg-[#202124] shadow-[0_24px_80px_-24px_rgba(26,21,53,0.55)] ${className}`}
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
