"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import type { BlockType } from "@/lib/site/blocks";

export type ContextMenuAction = {
  type: BlockType;
  icon: string;
  group: "basic" | "section" | "content";
};

export const CANVAS_ADD_ACTIONS: ContextMenuAction[] = [
  { type: "heading", icon: "H", group: "basic" },
  { type: "paragraph", icon: "¶", group: "basic" },
  { type: "imageBlock", icon: "🖼", group: "basic" },
  { type: "linkBlock", icon: "⬡", group: "basic" },
  { type: "spacer", icon: "↕", group: "basic" },
  { type: "divider", icon: "—", group: "basic" },
  { type: "videoBlock", icon: "▶", group: "basic" },
  { type: "pageHeader", icon: "▤", group: "section" },
  { type: "hero", icon: "★", group: "section" },
  { type: "richText", icon: "≡", group: "section" },
  { type: "cta", icon: "◎", group: "section" },
  { type: "gallery", icon: "▦", group: "content" },
  { type: "features", icon: "⊞", group: "content" },
  { type: "testimonials", icon: "❝", group: "content" },
];

type EditorContextMenuProps = {
  x: number;
  y: number;
  onSelect: (type: BlockType) => void;
  onClose: () => void;
};

export function EditorContextMenu({ x, y, onSelect, onClose }: EditorContextMenuProps) {
  const t = useTranslations("site.contextMenu");
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
    label: t(`groups.${g}`),
    items: CANVAS_ADD_ACTIONS.filter((a) => a.group === g),
  }));

  return (
    <div
      ref={ref}
      className="fixed z-[100] min-w-[220px] overflow-hidden rounded-xl border border-[--hair] bg-surface py-1 shadow-xl"
      style={style}
      role="menu"
    >
      <p className="px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-widest text-muted">
        {t("addElement")}
      </p>
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
              {t(`actions.${action.type}` as "actions.heading")}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
