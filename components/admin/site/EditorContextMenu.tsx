"use client";

import { useEffect, useRef } from "react";
import type { BlockType } from "@/lib/site/blocks";

export type ContextMenuAction = {
  type: BlockType;
  label: string;
  icon: string;
  group: "basic" | "section" | "content";
};

export const CANVAS_ADD_ACTIONS: ContextMenuAction[] = [
  { type: "heading", label: "Heading", icon: "H", group: "basic" },
  { type: "paragraph", label: "Text box", icon: "¶", group: "basic" },
  { type: "imageBlock", label: "Image", icon: "🖼", group: "basic" },
  { type: "linkBlock", label: "Button", icon: "⬡", group: "basic" },
  { type: "spacer", label: "Spacer", icon: "↕", group: "basic" },
  { type: "divider", label: "Divider", icon: "—", group: "basic" },
  { type: "videoBlock", label: "Video", icon: "▶", group: "basic" },
  { type: "pageHeader", label: "Page header", icon: "▤", group: "section" },
  { type: "hero", label: "Hero", icon: "★", group: "section" },
  { type: "richText", label: "Text section", icon: "≡", group: "section" },
  { type: "cta", label: "Call to action", icon: "◎", group: "section" },
  { type: "gallery", label: "Gallery", icon: "▦", group: "content" },
  { type: "features", label: "Features", icon: "⊞", group: "content" },
  { type: "testimonials", label: "Testimonials", icon: "❝", group: "content" },
];

const GROUP_LABELS: Record<ContextMenuAction["group"], string> = {
  basic: "Basic elements",
  section: "Sections",
  content: "Content blocks",
};

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

  const style: React.CSSProperties = {
    top: Math.min(y, window.innerHeight - 420),
    left: Math.min(x, window.innerWidth - 240),
  };

  const groups = (["basic", "section", "content"] as const).map((g) => ({
    id: g,
    label: GROUP_LABELS[g],
    items: CANVAS_ADD_ACTIONS.filter((a) => a.group === g),
  }));

  return (
    <div
      ref={ref}
      className="fixed z-[100] min-w-[220px] overflow-hidden rounded-xl border border-[--hair] bg-surface py-1 shadow-xl"
      style={style}
      role="menu"
    >
      <p className="px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-widest text-muted">Add element</p>
      {groups.map((group) => (
        <div key={group.id}>
          <p className="px-3 pb-0.5 pt-2 text-[0.6rem] font-semibold uppercase tracking-wider text-muted/80">
            {group.label}
          </p>
          {group.items.map((action) => (
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
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-base text-xs">
                {action.icon}
              </span>
              {action.label}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
