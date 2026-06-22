// ============================================================================
//  components/builder/Topbar.tsx — viewport switcher, history, zoom, save.
// ============================================================================

"use client";

import { useBuilder } from "@/lib/builder/store";
import { BREAKPOINTS, type BreakpointId } from "@/lib/builder/schema";

const BP_ICON: Record<string, string> = { desktop: "🖥", tablet: "▭", mobile: "▯" };

export function Topbar({
  saving,
  onSave,
  onExit,
}: {
  saving: boolean;
  onSave: () => void;
  onExit?: () => void;
}) {
  const breakpoint = useBuilder((s) => s.breakpoint);
  const setBreakpoint = useBuilder((s) => s.setBreakpoint);
  const zoom = useBuilder((s) => s.zoom);
  const setZoom = useBuilder((s) => s.setZoom);
  const mode = useBuilder((s) => s.mode);
  const setMode = useBuilder((s) => s.setMode);
  const cascade = useBuilder((s) => s.doc.cascade);
  const setCascade = useBuilder((s) => s.setCascade);
  const canUndo = useBuilder((s) => s.past.length > 0);
  const canRedo = useBuilder((s) => s.future.length > 0);
  const dirty = useBuilder((s) => s.dirty);
  const undo = useBuilder((s) => s.undo);
  const redo = useBuilder((s) => s.redo);

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-black/10 bg-white px-3 text-sm">
      <div className="flex items-center gap-2">
        {onExit && (
          <button onClick={onExit} className="rounded-md px-2 py-1 text-neutral-500 hover:bg-neutral-100" title="Back">
            ←
          </button>
        )}
        <span className="font-semibold text-neutral-800">Studio</span>
        <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700">v2 · preview</span>
      </div>

      {/* breakpoint switcher */}
      <div className="flex items-center gap-1 rounded-lg bg-neutral-100 p-0.5">
        {BREAKPOINTS.map((bp) => (
          <button
            key={bp.id}
            onClick={() => setBreakpoint(bp.id as BreakpointId)}
            title={`${bp.label} (${bp.width}px)`}
            className={`rounded-md px-2.5 py-1 text-xs transition ${
              breakpoint === bp.id ? "bg-white shadow-sm text-neutral-900" : "text-neutral-500 hover:text-neutral-800"
            }`}
          >
            {BP_ICON[bp.icon]} <span className="hidden lg:inline">{bp.label.split(" ")[0]}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        {/* cascade direction */}
        <button
          onClick={() => setCascade(cascade === "desktop-first" ? "mobile-first" : "desktop-first")}
          className="rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-50"
          title="Responsive cascade direction"
        >
          {cascade === "desktop-first" ? "Desktop-first" : "Mobile-first"}
        </button>

        {/* history */}
        <div className="flex items-center">
          <button disabled={!canUndo} onClick={undo} className="rounded-md px-2 py-1 text-neutral-600 disabled:opacity-30 hover:bg-neutral-100" title="Undo (⌘Z)">↶</button>
          <button disabled={!canRedo} onClick={redo} className="rounded-md px-2 py-1 text-neutral-600 disabled:opacity-30 hover:bg-neutral-100" title="Redo (⌘⇧Z)">↷</button>
        </div>

        {/* zoom */}
        <div className="flex items-center gap-1 text-xs text-neutral-500">
          <button onClick={() => setZoom(zoom - 0.1)} className="rounded px-1 hover:bg-neutral-100">−</button>
          <span className="w-9 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(zoom + 0.1)} className="rounded px-1 hover:bg-neutral-100">+</button>
        </div>

        {/* preview toggle */}
        <button
          onClick={() => setMode(mode === "design" ? "preview" : "design")}
          className="rounded-md border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
        >
          {mode === "design" ? "▶ Preview" : "✎ Design"}
        </button>

        <button
          onClick={onSave}
          disabled={saving}
          className="rounded-md bg-violet-600 px-3 py-1 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : dirty ? "Save" : "Saved"}
        </button>
      </div>
    </header>
  );
}
