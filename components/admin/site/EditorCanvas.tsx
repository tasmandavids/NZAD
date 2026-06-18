"use client";

import { useCallback, useRef, useState } from "react";
import { BackgroundShell } from "@/components/site/BackgroundShell";
import { BlockRenderer } from "@/components/site/BlockRenderer";
import type { PageBackground } from "@/lib/site/background";
import { BLOCK_MAP, type Block, type BlockType } from "@/lib/site/blocks";
import { blockFrameStyle, computeCanvasMinHeight } from "@/lib/site/layout";
import { num } from "@/lib/site/props";
import { EDITOR_PREVIEW_CONTEXT } from "@/lib/site/preview-context";
import { EditorContextMenu } from "./EditorContextMenu";

type EditorCanvasProps = {
  blocks: Block[];
  background: PageBackground;
  backgroundSelected: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onSelectBackground: () => void;
  onAddAt: (type: BlockType, index: number, at?: { x: number; y: number }) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onMoveBlock: (id: string, patch: { _x?: number; _y?: number }) => void;
};

type MenuState = { x: number; y: number; insertIndex: number; canvasX: number; canvasY: number } | null;

function CanvasBlock({
  block,
  selected,
  canvasRef,
  onSelect,
  onMoveBlock,
  onDuplicate,
  onDelete,
  onContextMenu,
}: {
  block: Block;
  selected: boolean;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  onSelect: () => void;
  onMoveBlock: (id: string, patch: { _x?: number; _y?: number }) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  const dragging = useRef(false);
  const start = useRef({ mx: 0, my: 0, x: 0, y: 0 });

  const onPointerDown = (e: React.PointerEvent) => {
    if (!(e.target as HTMLElement).closest("[data-drag-handle]")) return;
    e.preventDefault();
    e.stopPropagation();
    dragging.current = true;
    start.current = {
      mx: e.clientX,
      my: e.clientY,
      x: num(block.props, "_x", 5),
      y: num(block.props, "_y", 0),
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const dx = e.clientX - start.current.mx;
    const dy = e.clientY - start.current.my;
    const newX = Math.min(95, Math.max(0, start.current.x + (dx / rect.width) * 100));
    const newY = Math.max(0, start.current.y + dy);
    onMoveBlock(block.id, { _x: Math.round(newX * 10) / 10, _y: Math.round(newY) });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  return (
    <div
      data-block-shell
      className={`group absolute ${selected ? "ring-2 ring-brand" : "hover:ring-1 hover:ring-brand/40"}`}
      style={blockFrameStyle(block.props)}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onContextMenu={onContextMenu}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <div
        className={`absolute right-3 top-3 z-10 flex items-center gap-1 rounded-lg border border-[--hair] bg-surface/95 px-1 py-0.5 shadow-sm backdrop-blur transition ${
          selected || dragging.current ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
      >
        <button
          type="button"
          data-drag-handle
          title="Drag to move"
          className="cursor-grab rounded px-2 py-1 text-xs text-muted hover:bg-base hover:text-ink active:cursor-grabbing"
        >
          ⠿
        </button>
        <span className="px-1.5 text-[0.65rem] font-medium text-muted">{BLOCK_MAP[block.type].label}</span>
        <button type="button" title="Duplicate" onClick={onDuplicate} className="rounded px-1.5 py-1 text-xs text-muted hover:bg-base hover:text-ink">
          ⧉
        </button>
        <button type="button" title="Delete" onClick={onDelete} className="rounded px-1.5 py-1 text-xs text-red-500 hover:bg-red-500/10">
          ✕
        </button>
      </div>
      <BlockRenderer blocks={[block]} context={EDITOR_PREVIEW_CONTEXT} embedded />
    </div>
  );
}

export function EditorCanvas({
  blocks,
  background,
  backgroundSelected,
  selectedId,
  onSelect,
  onSelectBackground,
  onAddAt,
  onDelete,
  onDuplicate,
  onMoveBlock,
}: EditorCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<MenuState>(null);
  const minH = computeCanvasMinHeight(blocks);

  const canvasCoords = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { xPct: 5, yPx: 40 };
    const xPct = Math.min(95, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
    const yPx = Math.max(0, e.clientY - rect.top + (canvasRef.current?.scrollTop ?? 0));
    return { xPct, yPx };
  };

  const openMenu = useCallback((e: React.MouseEvent, insertIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    const { xPct, yPx } = canvasCoords(e);
    setMenu({ x: e.clientX, y: e.clientY, insertIndex, canvasX: xPct, canvasY: yPx });
  }, []);

  const handleCanvasContext = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-block-shell]")) return;
    openMenu(e, blocks.length);
  };

  return (
    <div className="relative min-h-full bg-base" onClick={() => onSelect(null)}>
      <div
        ref={canvasRef}
        className="relative w-full"
        style={{ minHeight: minH }}
        onContextMenu={handleCanvasContext}
      >
        <button
          type="button"
          aria-label="Edit page background"
          className={`absolute inset-0 text-left ${backgroundSelected ? "ring-2 ring-inset ring-brand" : ""}`}
          style={{ zIndex: 0 }}
          onClick={(e) => {
            e.stopPropagation();
            onSelectBackground();
          }}
        >
          <BackgroundShell background={background} />
          {backgroundSelected && (
            <span className="absolute left-3 top-3 rounded-md bg-surface/90 px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-widest text-brand shadow-sm">
              Background
            </span>
          )}
        </button>

        <div className="relative" style={{ zIndex: 1, minHeight: minH }}>
        {blocks.length === 0 ? (
          <div className="grid min-h-[50vh] place-items-center px-6 text-center" onContextMenu={(e) => openMenu(e, 0)}>
            <div className="max-w-sm space-y-2">
              <p className="text-lg font-medium text-ink">Your page is empty</p>
              <p className="text-sm text-muted">
                Right-click anywhere to add elements. Drag the ⠿ handle to move them around the canvas.
              </p>
            </div>
          </div>
        ) : (
          blocks.map((block, index) => (
            <CanvasBlock
              key={block.id}
              block={block}
              selected={selectedId === block.id}
              canvasRef={canvasRef}
              onSelect={() => onSelect(block.id)}
              onMoveBlock={onMoveBlock}
              onDuplicate={() => onDuplicate(block.id)}
              onDelete={() => onDelete(block.id)}
              onContextMenu={(e) => openMenu(e, index + 1)}
            />
          ))
        )}

        {blocks.length > 0 && (
          <div
            className="pointer-events-none absolute inset-x-0 grid h-24 place-items-center border-t border-dashed border-[--hair]/60 text-xs text-muted"
            style={{ top: minH - 96 }}
          >
            Right-click to add more
          </div>
        )}
        </div>
      </div>

      {menu && (
        <EditorContextMenu
          x={menu.x}
          y={menu.y}
          onSelect={(type) => {
            onAddAt(type, menu.insertIndex, { x: menu.canvasX, y: menu.canvasY });
            setMenu(null);
          }}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  );
}
