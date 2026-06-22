// ============================================================================
//  components/builder/CanvasViewport.tsx — the scrollable / zoomable stage.
//
//  Sizes a device frame to the active breakpoint width, injects the theme as
//  CSS custom properties (so {token} references resolve to live values), renders
//  the root node tree, deselects on background click, and accepts palette drops
//  via point hit-testing into the frame under the cursor.
// ============================================================================

"use client";

import { useRef, useState, type CSSProperties } from "react";
import { useBuilder } from "@/lib/builder/store";
import { BREAKPOINTS } from "@/lib/builder/schema";
import { themeToCssVars } from "@/lib/builder/tokens";
import { NodeRenderer } from "./NodeRenderer";
import { SelectionOverlay } from "./SelectionOverlay";

export function CanvasViewport() {
  const rootId = useBuilder((s) => s.doc.rootId);
  const theme = useBuilder((s) => s.doc.theme);
  const breakpoint = useBuilder((s) => s.breakpoint);
  const zoom = useBuilder((s) => s.zoom);
  const mode = useBuilder((s) => s.mode);
  const editable = mode === "design";
  const [dropFrame, setDropFrame] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const bp = BREAKPOINTS.find((b) => b.id === breakpoint) ?? BREAKPOINTS[0];
  const cssVars = themeToCssVars(theme) as CSSProperties;

  const frameUnderPoint = (x: number, y: number): string | null => {
    const stack = document.elementsFromPoint(x, y) as HTMLElement[];
    for (const el of stack) {
      const frame = el.closest<HTMLElement>('[data-builder-frame="true"]');
      if (frame) return frame.getAttribute("data-builder-node");
    }
    return rootId;
  };

  return (
    <div
      ref={scrollRef}
      className="relative flex-1 overflow-auto bg-[#EDECF4]"
      style={{ backgroundImage: "radial-gradient(rgba(0,0,0,0.05) 1px, transparent 1px)", backgroundSize: "16px 16px" }}
      onMouseDown={() => editable && useBuilder.getState().select(null)}
      onDragOver={(e) => {
        if (!editable) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        setDropFrame(frameUnderPoint(e.clientX, e.clientY));
      }}
      onDragLeave={() => setDropFrame(null)}
      onDrop={(e) => {
        if (!editable) return;
        e.preventDefault();
        const key = e.dataTransfer.getData("application/x-builder-component");
        const target = frameUnderPoint(e.clientX, e.clientY) ?? rootId;
        setDropFrame(null);
        if (key) useBuilder.getState().insertComponent(key, target);
      }}
    >
      <div className="flex min-h-full items-start justify-center py-12">
        <div
          style={{
            width: bp.width,
            transform: `scale(${zoom})`,
            transformOrigin: "top center",
            transition: "width 180ms ease",
          }}
        >
          {/* device frame */}
          <div
            data-builder-canvas
            style={{
              ...cssVars,
              width: "100%",
              minHeight: 600,
              background: "var(--ds-color-base, #fff)",
              boxShadow: "0 20px 60px rgba(21,21,27,0.18)",
              borderRadius: 8,
              overflow: "hidden",
              position: "relative",
              fontFamily: "var(--ds-font-body)",
              color: "var(--ds-color-body)",
            }}
            onMouseDown={(e) => {
              // clicking the frame chrome (not a node) deselects
              if ((e.target as HTMLElement).hasAttribute("data-builder-canvas")) {
                useBuilder.getState().select(null);
              }
            }}
          >
            <NodeRenderer id={rootId} editable={editable} />
            {dropFrame && <DropHighlight frameId={dropFrame} />}
          </div>
        </div>
      </div>

      <SelectionOverlay zoom={zoom} />
    </div>
  );
}

function DropHighlight({ frameId }: { frameId: string }) {
  // A lightweight outline rendered over the hovered drop target during a palette drag.
  const el = typeof document !== "undefined"
    ? document.querySelector<HTMLElement>(`[data-builder-node="${frameId}"]`)
    : null;
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return (
    <div
      style={{
        position: "fixed",
        left: r.left, top: r.top, width: r.width, height: r.height,
        outline: "2px solid #EC4899", outlineOffset: -2, background: "rgba(236,72,153,0.06)",
        pointerEvents: "none", zIndex: 8000,
      }}
    />
  );
}
