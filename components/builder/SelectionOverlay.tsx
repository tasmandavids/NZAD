// ============================================================================
//  components/builder/SelectionOverlay.tsx — bounding box, resize handles,
//  freeform drag and alignment-guide snapping (pillar 1).
//
//  Rendered in a fixed full-screen layer. It measures the selected node's DOM
//  rect (which already accounts for canvas zoom) and draws the box + 8 handles
//  in screen space. Pointer deltas are divided by `zoom` to convert back to
//  layout units before being written to the store as transient updates, so the
//  drag coalesces into a single undo step (beginTx/endTx).
// ============================================================================

"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useBuilder, useNode } from "@/lib/builder/store";
import type { StyleSet } from "@/lib/builder/schema";

type Rect = { left: number; top: number; width: number; height: number };
type Handle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw" | "body";
type Guide = { x?: number; y?: number };

const SNAP = 6; // px threshold in screen space

export function SelectionOverlay({ zoom }: { zoom: number }) {
  const selectedId = useBuilder((s) => (s.selection.length === 1 ? s.selection[0] : null));
  const mode = useBuilder((s) => s.mode);
  const breakpoint = useBuilder((s) => s.breakpoint);
  const node = useNode(selectedId ?? "");
  const [rect, setRect] = useState<Rect | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const drag = useRef<null | { handle: Handle; startX: number; startY: number; start: StyleSet; pointerId: number }>(null);

  const elFor = (id: string) =>
    document.querySelector<HTMLElement>(`[data-builder-node="${id}"]`);

  const measure = useCallback(() => {
    if (!selectedId) { setRect(null); return; }
    const el = elFor(selectedId);
    if (!el) { setRect(null); return; }
    const r = el.getBoundingClientRect();
    setRect({ left: r.left, top: r.top, width: r.width, height: r.height });
  }, [selectedId]);

  useLayoutEffect(() => { measure(); }, [measure, node, breakpoint, zoom]);

  useEffect(() => {
    const onScroll = () => measure();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [measure]);

  if (mode === "preview" || !selectedId || !node || !rect || node.locked) return null;

  const isAbsolute = node.style.position === "absolute" || node.style.layout === "absolute";

  // ── pointer handlers ────────────────────────────────────────────────
  const onHandleDown = (handle: Handle) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    useBuilder.getState().beginTx();
    drag.current = {
      handle,
      startX: e.clientX,
      startY: e.clientY,
      start: { ...node.style },
      pointerId: e.pointerId,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.startX) / zoom;
    const dy = (e.clientY - d.startY) / zoom;
    const patch: Partial<StyleSet> = {};
    const num = (v: unknown, fallback = 0) => (typeof v === "number" ? v : fallback);

    if (d.handle === "body" && isAbsolute) {
      let nx = num(d.start.left) + dx;
      let ny = num(d.start.top) + dy;
      const snapped = applySnap(selectedId, nx, ny, rect.width, rect.height, zoom);
      nx = snapped.x; ny = snapped.y;
      setGuides(snapped.guides);
      patch.position = "absolute";
      patch.left = Math.round(nx);
      patch.top = Math.round(ny);
    } else {
      // resize
      const startW = num(d.start.width, rect.width);
      const startH = num(d.start.height, rect.height);
      let w = startW;
      let h = startH;
      if (d.handle.includes("e")) w = Math.max(8, startW + dx);
      if (d.handle.includes("w")) w = Math.max(8, startW - dx);
      if (d.handle.includes("s")) h = Math.max(8, startH + dy);
      if (d.handle.includes("n")) h = Math.max(8, startH - dy);
      if (e.shiftKey && d.handle.length === 2) {
        // aspect-ratio lock on corner handles
        const ratio = startW / Math.max(1, startH);
        h = w / ratio;
      }
      if (d.handle.includes("e") || d.handle.includes("w")) patch.width = Math.round(w);
      if (d.handle.includes("n") || d.handle.includes("s")) patch.height = Math.round(h);
      // west/north handles also move the origin when absolute
      if (isAbsolute) {
        if (d.handle.includes("w")) patch.left = Math.round(num(d.start.left) + dx);
        if (d.handle.includes("n")) patch.top = Math.round(num(d.start.top) + dy);
        patch.position = "absolute";
      }
    }
    useBuilder.getState().updateStyle(selectedId, patch, { transient: true });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!drag.current) return;
    try { (e.target as HTMLElement).releasePointerCapture(drag.current.pointerId); } catch { /* noop */ }
    drag.current = null;
    setGuides([]);
    useBuilder.getState().endTx();
  };

  const boxStyle: CSSProperties = {
    position: "fixed",
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    pointerEvents: "none",
    zIndex: 9000,
  };

  const handleStyle = (cursor: string, extra: CSSProperties): CSSProperties => ({
    position: "absolute",
    width: 10,
    height: 10,
    background: "#fff",
    border: "1.5px solid #6B66C9",
    borderRadius: 2,
    pointerEvents: "auto",
    cursor,
    ...extra,
  });

  return (
    <>
      {/* guide lines */}
      {guides.map((g, i) =>
        g.x !== undefined ? (
          <div key={`gx-${i}`} style={{ position: "fixed", left: g.x, top: 0, bottom: 0, width: 1, background: "#EC4899", zIndex: 9001, pointerEvents: "none" }} />
        ) : (
          <div key={`gy-${i}`} style={{ position: "fixed", top: g.y, left: 0, right: 0, height: 1, background: "#EC4899", zIndex: 9001, pointerEvents: "none" }} />
        ),
      )}

      <div style={boxStyle} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
        <div style={{ position: "absolute", inset: 0, border: "2px solid #6B66C9", pointerEvents: "none" }} />

        {/* body drag (freeform move) — only meaningful when absolute */}
        {isAbsolute && (
          <div
            onPointerDown={onHandleDown("body")}
            style={{ position: "absolute", inset: 8, cursor: "move", pointerEvents: "auto" }}
          />
        )}

        {/* edge + corner handles */}
        <div onPointerDown={onHandleDown("nw")} style={handleStyle("nwse-resize", { left: -5, top: -5 })} />
        <div onPointerDown={onHandleDown("ne")} style={handleStyle("nesw-resize", { right: -5, top: -5 })} />
        <div onPointerDown={onHandleDown("sw")} style={handleStyle("nesw-resize", { left: -5, bottom: -5 })} />
        <div onPointerDown={onHandleDown("se")} style={handleStyle("nwse-resize", { right: -5, bottom: -5 })} />
        <div onPointerDown={onHandleDown("n")} style={handleStyle("ns-resize", { left: "50%", top: -5, marginLeft: -5 })} />
        <div onPointerDown={onHandleDown("s")} style={handleStyle("ns-resize", { left: "50%", bottom: -5, marginLeft: -5 })} />
        <div onPointerDown={onHandleDown("w")} style={handleStyle("ew-resize", { top: "50%", left: -5, marginTop: -5 })} />
        <div onPointerDown={onHandleDown("e")} style={handleStyle("ew-resize", { top: "50%", right: -5, marginTop: -5 })} />

        {/* size badge */}
        <div style={{ position: "absolute", bottom: -22, left: 0, background: "#6B66C9", color: "#fff", fontSize: 11, padding: "1px 6px", borderRadius: 4, pointerEvents: "none", whiteSpace: "nowrap" }}>
          {Math.round(rect.width)} × {Math.round(rect.height)}
        </div>
      </div>
    </>
  );
}

/** Snap an absolute node's proposed (x,y) to sibling/parent edges + centers. */
function applySnap(
  id: string | null,
  x: number,
  y: number,
  w: number,
  h: number,
  zoom: number,
): { x: number; y: number; guides: Guide[] } {
  if (!id) return { x, y, guides: [] };
  const el = document.querySelector<HTMLElement>(`[data-builder-node="${id}"]`);
  const parent = el?.parentElement;
  if (!parent) return { x, y, guides: [] };
  const parentRect = parent.getBoundingClientRect();
  const guides: Guide[] = [];

  // candidate vertical lines (screen x) from parent + siblings
  const vTargets: number[] = [parentRect.left, parentRect.left + parentRect.width / 2, parentRect.right];
  const hTargets: number[] = [parentRect.top, parentRect.top + parentRect.height / 2, parentRect.bottom];
  parent.querySelectorAll<HTMLElement>(":scope > [data-builder-node]").forEach((sib) => {
    if (sib === el) return;
    const r = sib.getBoundingClientRect();
    vTargets.push(r.left, r.left + r.width / 2, r.right);
    hTargets.push(r.top, r.top + r.height / 2, r.bottom);
  });

  // proposed screen positions of this node's left/center/right edges
  const nodeLeftScreen = parentRect.left + x * zoom;
  const screenW = w; // already screen px
  const leftEdges = [nodeLeftScreen, nodeLeftScreen + screenW / 2, nodeLeftScreen + screenW];
  const nodeTopScreen = parentRect.top + y * zoom;
  const topEdges = [nodeTopScreen, nodeTopScreen + h / 2, nodeTopScreen + h];

  let snapX = x;
  for (let i = 0; i < leftEdges.length; i++) {
    for (const t of vTargets) {
      if (Math.abs(leftEdges[i] - t) <= SNAP) {
        const deltaScreen = t - leftEdges[i];
        snapX = x + deltaScreen / zoom;
        guides.push({ x: t });
        break;
      }
    }
  }
  let snapY = y;
  for (let i = 0; i < topEdges.length; i++) {
    for (const t of hTargets) {
      if (Math.abs(topEdges[i] - t) <= SNAP) {
        const deltaScreen = t - topEdges[i];
        snapY = y + deltaScreen / zoom;
        guides.push({ y: t });
        break;
      }
    }
  }
  return { x: snapX, y: snapY, guides };
}
