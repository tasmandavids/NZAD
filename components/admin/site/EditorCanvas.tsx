"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { BackgroundShell } from "@/components/site/BackgroundShell";
import { EditorBlockPreview } from "@/components/admin/site/EditorBlockPreview";
import {
  movingRect,
  rectsFromBlocks,
  snapWithAlignmentGuides,
  type GuideLine,
} from "@/lib/site/alignment-guides";
import type { PageBackground } from "@/lib/site/background";
import { type Block, type BlockType } from "@/lib/site/blocks";
import {
  CANVAS_GRID,
  blockFrameClassName,
  blockFramePaddingClass,
  blockFrameStyle,
  clampGridX,
  computeCanvasMinHeight,
  snapGridHeight,
  snapGridWidth,
  snapGridX,
  snapGridY,
  usesCanvasInEditor,
  type LayoutPatch,
} from "@/lib/site/layout";
import { bool, num } from "@/lib/site/props";
import { EDITOR_PREVIEW_CONTEXT } from "@/lib/site/preview-context";
import type { NavLink } from "@/lib/site/queries";
import { SiteHeader } from "@/components/site/SiteHeader";
import { EditorContextMenu } from "./EditorContextMenu";
import { blockLabel } from "@/lib/site/i18n-labels";

type EditorCanvasProps = {
  blocks: Block[];
  background: PageBackground;
  backgroundSelected: boolean;
  selectedIds: string[];
  previewMode?: boolean;
  studioName: string;
  logoUrl: string | null;
  nav: NavLink[];
  portalLabel: string;
  currentPageId: string;
  navPages: Array<{ id: string; slug: string; isHome: boolean }>;
  onSelect: (id: string | null, opts?: { shift?: boolean }) => void;
  onSelectBackground: () => void;
  onAddAt: (type: BlockType, index: number, at?: { x: number; y: number }) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onUpdateLayout: (ids: string[], patch: LayoutPatch | ((props: Block["props"]) => LayoutPatch)) => void;
  onLayoutGestureStart: () => void;
  onLayoutGestureEnd: () => void;
};

type MenuState = { x: number; y: number; insertIndex: number; canvasX: number; canvasY: number } | null;

function GridOverlay() {
  const colPct = 100 / CANVAS_GRID.columns;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundImage: `
          linear-gradient(to right, color-mix(in srgb, var(--brand) 12%, transparent) 1px, transparent 1px),
          linear-gradient(to bottom, color-mix(in srgb, var(--brand) 12%, transparent) 1px, transparent 1px)
        `,
        backgroundSize: `${colPct}% ${CANVAS_GRID.rowHeight}px`,
      }}
    />
  );
}

function AlignmentGuides({ guides }: { guides: GuideLine[] }) {
  if (!guides.length) return null;
  return (
    <>
      {guides.map((g, i) =>
        g.axis === "x" ? (
          <div
            key={`x-${i}-${g.pct}`}
            className="pointer-events-none absolute bottom-0 top-0 z-[60] w-px bg-brand"
            style={{ left: `${g.pct}%` }}
          />
        ) : (
          <div
            key={`y-${i}-${g.px}`}
            className="pointer-events-none absolute left-0 right-0 z-[60] h-px bg-brand"
            style={{ top: g.px }}
          />
        ),
      )}
    </>
  );
}

function StackSectionBlock({
  block,
  selected,
  previewMode,
  onSelect,
  onDuplicate,
  onDelete,
  onContextMenu,
}: {
  block: Block;
  selected: boolean;
  previewMode?: boolean;
  onSelect: (shift: boolean) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  const t = useTranslations("site.editor");
  const tSite = useTranslations("site");
  return (
    <div
      data-block-shell
      className={`group relative w-full ${
        previewMode ? "" : selected ? "ring-2 ring-inset ring-brand" : "hover:ring-1 hover:ring-inset hover:ring-brand/30"
      }`}
      onClick={(e) => {
        if (previewMode) return;
        e.stopPropagation();
        onSelect(e.shiftKey);
      }}
      onContextMenu={previewMode ? undefined : onContextMenu}
    >
      {!previewMode && (
      <div
        className={`absolute right-3 top-3 z-10 flex items-center gap-1 rounded-lg border border-[--hair] bg-surface/95 px-1 py-0.5 shadow-sm backdrop-blur transition ${
          selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
      >
        <span className="px-1.5 text-[0.65rem] font-medium text-muted">{blockLabel(tSite, block.type)}</span>
        <button type="button" title={t("duplicate")} onClick={onDuplicate} className="rounded px-1.5 py-1 text-xs text-muted hover:bg-base hover:text-ink">
          ⧉
        </button>
        <button type="button" title={t("delete")} onClick={onDelete} className="rounded px-1.5 py-1 text-xs text-red-500 hover:bg-red-500/10">
          ✕
        </button>
      </div>
      )}
      <EditorBlockPreview blocks={[block]} context={EDITOR_PREVIEW_CONTEXT} />
    </div>
  );
}

function CanvasBlock({
  block,
  blocks,
  selected,
  previewMode,
  canvasRef,
  onSelect,
  onUpdateLayout,
  onDuplicate,
  onDelete,
  onContextMenu,
  onLayoutGestureStart,
  onGuidesChange,
  onLayoutGestureEnd,
}: {
  block: Block;
  blocks: Block[];
  selected: boolean;
  previewMode?: boolean;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  onSelect: (shift: boolean) => void;
  onUpdateLayout: EditorCanvasProps["onUpdateLayout"];
  onDuplicate: () => void;
  onDelete: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onLayoutGestureStart: () => void;
  onGuidesChange: (guides: GuideLine[]) => void;
  onLayoutGestureEnd: () => void;
}) {
  const t = useTranslations("site.editor");
  const tSite = useTranslations("site");
  const locked = bool(block.props, "_locked", false);
  const dragging = useRef(false);
  const resizing = useRef<"se" | "e" | "s" | null>(null);
  const start = useRef({ mx: 0, my: 0, x: 0, y: 0, w: 0, h: 0, canvasW: 0 });

  const shellHeight = (el: HTMLElement | null) =>
    num(block.props, "_height", 0) || el?.offsetHeight || CANVAS_GRID.rowHeight * 4;

  const beginDrag = (e: React.PointerEvent) => {
    if (locked) return;
    if (!(e.target as HTMLElement).closest("[data-drag-handle]")) return;
    e.preventDefault();
    e.stopPropagation();
    onLayoutGestureStart();
    dragging.current = true;
    const rect = canvasRef.current?.getBoundingClientRect();
    start.current = {
      mx: e.clientX,
      my: e.clientY,
      x: num(block.props, "_x", 0),
      y: num(block.props, "_y", 0),
      w: num(block.props, "_width", 33.333),
      h: shellHeight(null),
      canvasW: rect?.width ?? 1,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const beginResize = (e: React.PointerEvent, edge: "se" | "e" | "s") => {
    if (locked) return;
    e.preventDefault();
    e.stopPropagation();
    onLayoutGestureStart();
    resizing.current = edge;
    const rect = canvasRef.current?.getBoundingClientRect();
    const shell = (e.currentTarget as HTMLElement).closest("[data-block-shell]") as HTMLElement | null;
    start.current = {
      mx: e.clientX,
      my: e.clientY,
      x: num(block.props, "_x", 0),
      y: num(block.props, "_y", 0),
      w: num(block.props, "_width", 33.333),
      h: shellHeight(shell),
      canvasW: rect?.width ?? 1,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!canvasRef.current) return;

    if (dragging.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const dx = e.clientX - start.current.mx;
      const dy = e.clientY - start.current.my;
      const rawX = start.current.x + (dx / rect.width) * 100;
      const rawY = start.current.y + dy;
      const width = num(block.props, "_width", start.current.w);
      const height = start.current.h;
      const moving = movingRect(block.id, rawX, rawY, width, height);
      const others = rectsFromBlocks(blocks, block.id);
      const { x, y, guides } = snapWithAlignmentGuides(moving, others, rect.width);
      onGuidesChange(guides);
      onUpdateLayout([block.id], { _x: clampGridX(x, width), _y: y });
      return;
    }

    if (resizing.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const dx = e.clientX - start.current.mx;
      const dy = e.clientY - start.current.my;
      const patch: LayoutPatch = {};

      if (resizing.current === "se" || resizing.current === "e") {
        const rawW = start.current.w + (dx / rect.width) * 100;
        patch._width = snapGridWidth(rawW);
        patch._x = clampGridX(start.current.x, patch._width);
      }
      if (resizing.current === "se" || resizing.current === "s") {
        patch._height = snapGridHeight(start.current.h + dy);
      }

      onUpdateLayout([block.id], patch);
    }
  };

  const endPointer = (e: React.PointerEvent) => {
    if (!dragging.current && !resizing.current) return;
    dragging.current = false;
    resizing.current = null;
    onGuidesChange([]);
    onLayoutGestureEnd();
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const hasHeight = num(block.props, "_height", 0) > 0;
  const handle =
    "absolute z-20 border border-brand bg-surface shadow-sm transition hover:bg-brand/10";

  return (
    <div
      data-block-shell
      className={`group absolute ${
        previewMode ? "" : selected ? "ring-2 ring-brand" : "hover:ring-1 hover:ring-brand/40"
      } ${locked ? "opacity-95" : ""} ${blockFrameClassName(block.props)}`}
      style={blockFrameStyle(block.props)}
      onClick={(e) => {
        if (previewMode) return;
        e.stopPropagation();
        onSelect(e.shiftKey);
      }}
      onContextMenu={previewMode ? undefined : onContextMenu}
      onPointerDown={previewMode ? undefined : beginDrag}
      onPointerMove={previewMode ? undefined : onPointerMove}
      onPointerUp={previewMode ? undefined : endPointer}
    >
      {!previewMode && (
      <div
        className={`absolute right-3 top-3 z-10 flex items-center gap-1 rounded-lg border border-[--hair] bg-surface/95 px-1 py-0.5 shadow-sm backdrop-blur transition ${
          selected || dragging.current ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
      >
        {locked ? (
          <span className="px-1.5 text-xs text-muted" title={t("locked")}>
            🔒
          </span>
        ) : (
          <button
            type="button"
            data-drag-handle
            title={t("dragToMove")}
            className="cursor-grab rounded px-2 py-1 text-xs text-muted hover:bg-base hover:text-ink active:cursor-grabbing"
          >
            ⠿
          </button>
        )}
        <span className="px-1.5 text-[0.65rem] font-medium text-muted">{blockLabel(tSite, block.type)}</span>
        <button type="button" title={t("duplicate")} onClick={onDuplicate} className="rounded px-1.5 py-1 text-xs text-muted hover:bg-base hover:text-ink">
          ⧉
        </button>
        <button type="button" title={t("delete")} onClick={onDelete} className="rounded px-1.5 py-1 text-xs text-red-500 hover:bg-red-500/10">
          ✕
        </button>
      </div>
      )}

      {selected && !locked && !previewMode && (
        <>
          <div
            data-resize-handle
            title={t("resize")}
            className={`${handle} bottom-0 right-0 h-3 w-3 cursor-se-resize rounded-sm`}
            onPointerDown={(e) => beginResize(e, "se")}
            onPointerMove={onPointerMove}
            onPointerUp={endPointer}
          />
          <div
            data-resize-handle
            title={t("resizeWidth")}
            className={`${handle} right-0 top-1/2 h-6 w-2 -translate-y-1/2 cursor-e-resize rounded-sm`}
            onPointerDown={(e) => beginResize(e, "e")}
            onPointerMove={onPointerMove}
            onPointerUp={endPointer}
          />
          <div
            data-resize-handle
            title={t("resizeHeight")}
            className={`${handle} bottom-0 left-1/2 h-2 w-6 -translate-x-1/2 cursor-s-resize rounded-sm`}
            onPointerDown={(e) => beginResize(e, "s")}
            onPointerMove={onPointerMove}
            onPointerUp={endPointer}
          />
          {hasHeight && (
            <span className="absolute bottom-1 left-2 z-10 rounded bg-surface/90 px-1.5 py-0.5 text-[0.6rem] text-muted">
              {num(block.props, "_width", 0).toFixed(0)}% × {num(block.props, "_height", 0)}px
            </span>
          )}
        </>
      )}

      <div className={`${hasHeight ? "h-full overflow-auto" : ""} ${blockFramePaddingClass(block.props)}`}>
        <EditorBlockPreview blocks={[block]} context={EDITOR_PREVIEW_CONTEXT} />
      </div>
    </div>
  );
}

export function EditorCanvas({
  blocks,
  background,
  backgroundSelected,
  selectedIds,
  previewMode = false,
  studioName,
  logoUrl,
  nav,
  portalLabel,
  currentPageId,
  navPages,
  onSelect,
  onSelectBackground,
  onAddAt,
  onDelete,
  onDuplicate,
  onUpdateLayout,
  onLayoutGestureStart,
  onLayoutGestureEnd,
}: EditorCanvasProps) {
  const t = useTranslations("site.editor");
  const canvasRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<MenuState>(null);
  const [guides, setGuides] = useState<GuideLine[]>([]);
  const minH = computeCanvasMinHeight(blocks);

  const canvasCoords = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { xPct: 0, yPx: CANVAS_GRID.rowHeight };
    const rawX = ((e.clientX - rect.left) / rect.width) * 100;
    const rawY = e.clientY - rect.top + (canvasRef.current?.scrollTop ?? 0);
    return { xPct: snapGridX(rawX), yPx: snapGridY(rawY) };
  };

  const openMenu = useCallback((e: React.MouseEvent, insertIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    const { xPct, yPx } = canvasCoords(e);
    setMenu({ x: e.clientX, y: e.clientY, insertIndex, canvasX: xPct, canvasY: yPx });
  }, []);

  const resolveNavHref = (link: NavLink) => {
    const match = navPages.find((p) => (link.isHome ? p.isHome : p.slug === link.slug));
    return match ? `/portal/admin/site/${match.id}` : "#";
  };

  const homePageId = navPages.find((p) => p.isHome)?.id ?? currentPageId;

  const handleCanvasContext = (e: React.MouseEvent) => {
    if (previewMode) return;
    if ((e.target as HTMLElement).closest("[data-block-shell]")) return;
    openMenu(e, blocks.length);
  };

  return (
    <div className="relative min-h-full bg-base" onClick={() => !previewMode && onSelect(null)}>
      {previewMode && (
        <div className="sticky top-0 z-50 border-b border-brand/30 bg-brand/5 px-4 py-2 text-center text-xs text-muted backdrop-blur">
          {t("previewModeBanner")}
        </div>
      )}
      <SiteHeader
        studioName={studioName}
        logoUrl={logoUrl}
        nav={nav}
        portalLabel={portalLabel}
        resolveHref={resolveNavHref}
        homeHref={`/portal/admin/site/${homePageId}`}
      />

      <div
        ref={canvasRef}
        className="relative w-full"
        style={{ minHeight: minH }}
        onContextMenu={handleCanvasContext}
      >
        <button
          type="button"
          aria-label={t("editPageBackground")}
          className={`absolute inset-0 text-left ${backgroundSelected ? "ring-2 ring-inset ring-brand" : ""}`}
          style={{ zIndex: 0 }}
          onClick={(e) => {
            if (previewMode) return;
            e.stopPropagation();
            onSelectBackground();
          }}
        >
          <BackgroundShell background={background} />
          {!previewMode && <GridOverlay />}
          {backgroundSelected && (
            <span className="absolute left-3 top-3 rounded-md bg-surface/90 px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-widest text-brand shadow-sm">
              {t("backgroundLabel")}
            </span>
          )}
        </button>

        <div className="relative" style={{ zIndex: 1, minHeight: minH }}>
          <AlignmentGuides guides={guides} />

          {blocks.length === 0 ? (
            <div className="grid min-h-[50vh] place-items-center px-6 text-center" onContextMenu={(e) => openMenu(e, 0)}>
              <div className="max-w-sm space-y-2">
                <p className="text-lg font-medium text-ink">{t("emptyPage")}</p>
                <p className="text-sm text-muted">{t("emptyPageHint")}</p>
              </div>
            </div>
          ) : (
            blocks.map((block, index) =>
              usesCanvasInEditor(block) ? (
                <CanvasBlock
                  key={block.id}
                  block={block}
                  blocks={blocks}
                  selected={selectedIds.includes(block.id)}
                  previewMode={previewMode}
                  canvasRef={canvasRef}
                  onSelect={(shift) => onSelect(block.id, { shift })}
                  onUpdateLayout={onUpdateLayout}
                  onLayoutGestureStart={onLayoutGestureStart}
                  onLayoutGestureEnd={onLayoutGestureEnd}
                  onGuidesChange={setGuides}
                  onDuplicate={() => onDuplicate(block.id)}
                  onDelete={() => onDelete(block.id)}
                  onContextMenu={(e) => openMenu(e, index + 1)}
                />
              ) : (
                <StackSectionBlock
                  key={block.id}
                  block={block}
                  selected={selectedIds.includes(block.id)}
                  previewMode={previewMode}
                  onSelect={(shift) => onSelect(block.id, { shift })}
                  onDuplicate={() => onDuplicate(block.id)}
                  onDelete={() => onDelete(block.id)}
                  onContextMenu={(e) => openMenu(e, index + 1)}
                />
              ),
            )
          )}

          {blocks.length > 0 && !previewMode && (
            <div
              className="pointer-events-none absolute inset-x-0 grid h-24 place-items-center border-t border-dashed border-[--hair]/60 text-xs text-muted"
              style={{ top: minH - 96 }}
            >
              {t("canvasHint")}
            </div>
          )}
        </div>
      </div>

      {menu && !previewMode && (
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
