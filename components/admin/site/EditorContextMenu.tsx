"use client";

import { useEffect, useRef } from "react";
import type { BlockType } from "@/lib/site/blocks";

export type ContextMenuAction = {
  type: BlockType;
  label: string;
  icon: string;
};

export const CANVAS_ADD_ACTIONS: ContextMenuAction[] = [
  { type: "heading", label: "Heading", icon: "H" },
  { type: "paragraph", label: "Text", icon: "¶" },
  { type: "imageBlock", label: "Image", icon: "🖼" },
  { type: "videoBlock", label: "Video", icon: "▶" },
  { type: "linkBlock", label: "Link", icon: "🔗" },
  { type: "pageHeader", label: "Page header", icon: "▤" },
  { type: "richText", label: "Text section", icon: "≡" },
  { type: "gallery", label: "Gallery", icon: "▦" },
  { type: "cta", label: "Call to action", icon: "▶" },
];

type EditorContextMenuProps = {
  x: number;
  y: number;
  onSelect: (type: BlockType) => void;
  onClose: () => void;
};

export function EditorContextMenu({ x, y, onSelect, onClose }: EditorContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  // Keep menu on screen
  const style: React.CSSProperties = {
    top: Math.min(y, window.innerHeight - 320),
    left: Math.min(x, window.innerWidth - 220),
  };

  return (
    <div
      ref={ref}
      className="fixed z-[100] min-w-[200px] overflow-hidden rounded-xl border border-[--hair] bg-surface py-1 shadow-xl"
      style={style}
      role="menu"
    >
      <p className="px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-widest text-muted">Add element</p>
      {CANVAS_ADD_ACTIONS.map((action) => (
        <button
          key={action.type}
          type="button"
          role="menuitem"
          onClick={() => {
            onSelect(action.type);
            onClose();
          }}
          className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-ink transition hover:bg-base"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-base text-xs">{action.icon}</span>
          {action.label}
        </button>
      ))}
    </div>
  );
}
