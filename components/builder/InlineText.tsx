// ============================================================================
//  components/builder/InlineText.tsx — inline WYSIWYG text editor (pillar 3).
//
//  A contenteditable surface that hydrates from the RichText model and writes
//  parsed RichText back to the store on input. A floating toolbar appears over
//  the current selection exposing the "deep text mechanics": bold/italic/
//  underline, heading level, links, per-selection color, text gradients and
//  letter-spacing. Edits are transient (no per-keystroke history); the single
//  undo entry is recorded when the edit session ends (see store.setEditing).
//
//  NOTE: this uses a contenteditable surface rather than pulling in the full
//  TipTap/Slate dependency tree. The RichText run model is editor-agnostic, so
//  swapping in TipTap later is a localised change to this one component.
// ============================================================================

"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { NodeId, RichBlock, RichText, TextMark } from "@/lib/builder/schema";
import { domToRich, markStyleString } from "@/lib/builder/rich";
import { useBuilder } from "@/lib/builder/store";

const TAG_EL: Record<NonNullable<RichBlock["tag"]>, string> = {
  p: "p", h1: "h1", h2: "h2", h3: "h3", h4: "h4", li: "li", blockquote: "blockquote",
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function richToHtml(rich: RichText): string {
  return rich
    .map((block) => {
      const tag = TAG_EL[block.tag ?? "p"];
      const inner =
        block.runs
          .map((run) => {
            if (run.text === "\n") return "<br>";
            const s = markStyleString(run.marks);
            const safe = escapeHtml(run.text);
            if (run.marks?.link) {
              return `<a href="${run.marks.link}"${s ? ` style="${s}"` : ""}>${safe}</a>`;
            }
            return s ? `<span style="${s}">${safe}</span>` : safe;
          })
          .join("") || "<br>";
      return `<${tag} style="margin:0">${inner}</${tag}>`;
    })
    .join("");
}

const GRADIENTS = [
  "linear-gradient(90deg,#8B5CF6,#EC4899)",
  "linear-gradient(90deg,#6B66C9,#06B6D4)",
  "linear-gradient(90deg,#F59E0B,#EF4444)",
  "linear-gradient(135deg,#10B981,#3B82F6)",
];

const SWATCHES = ["{color.brand}", "{color.ink}", "{color.muted}", "#FFFFFF", "#EC4899", "#06B6D4"];

export function InlineText({ id, defaultTag }: { id: NodeId; defaultTag: RichBlock["tag"] }) {
  const ref = useRef<HTMLDivElement>(null);
  const setText = useBuilder((s) => s.setText);
  const setEditing = useBuilder((s) => s.setEditing);
  const initialRich = useBuilder((s) => s.doc.nodes[id]?.props.rich);
  const [toolbar, setToolbar] = useState<{ top: number; left: number } | null>(null);

  // Hydrate once on mount; we deliberately do NOT re-sync innerHTML from props
  // afterwards (that would fight the caret). The store is the destination.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = richToHtml(initialRich ?? [{ tag: defaultTag, runs: [{ text: "" }] }]);
    el.focus();
    placeCaretEnd(el);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const commit = () => {
    const el = ref.current;
    if (!el) return;
    setText(id, domToRich(el, defaultTag), true);
  };

  const updateToolbar = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) { setToolbar(null); return; }
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) { setToolbar(null); return; }
    setToolbar({ top: rect.top - 46, left: rect.left + rect.width / 2 });
  };

  useEffect(() => {
    document.addEventListener("selectionchange", updateToolbar);
    return () => document.removeEventListener("selectionchange", updateToolbar);
  }, []);

  // ── formatting commands ────────────────────────────────────────────
  const exec = (cmd: string, value?: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false, value);
    commit();
  };

  const wrapSelection = (mark: TextMark) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    const span = document.createElement("span");
    span.setAttribute("style", markStyleString(mark));
    try {
      range.surroundContents(span);
    } catch {
      span.appendChild(range.extractContents());
      range.insertNode(span);
    }
    sel.removeAllRanges();
    commit();
  };

  const setBlockTag = (tag: RichBlock["tag"]) => exec("formatBlock", (tag ?? "p").toUpperCase());

  return (
    <>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={commit}
        onBlur={() => setEditing(null)}
        onKeyDown={(e) => {
          if (e.key === "Escape") { e.preventDefault(); setEditing(null); }
          e.stopPropagation(); // don't let canvas shortcuts fire while typing
        }}
        onMouseDown={(e) => e.stopPropagation()}
        style={{ outline: "none", cursor: "text", minWidth: 8 }}
      />
      {toolbar && (
        <FloatingToolbar
          pos={toolbar}
          onCmd={exec}
          onWrap={wrapSelection}
          onBlock={setBlockTag}
        />
      )}
    </>
  );
}

function FloatingToolbar({
  pos,
  onCmd,
  onWrap,
  onBlock,
}: {
  pos: { top: number; left: number };
  onCmd: (cmd: string, value?: string) => void;
  onWrap: (mark: TextMark) => void;
  onBlock: (tag: RichBlock["tag"]) => void;
}) {
  const wrapStyle: CSSProperties = {
    position: "fixed",
    top: pos.top,
    left: pos.left,
    transform: "translateX(-50%)",
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    gap: 2,
    padding: 4,
    borderRadius: 10,
    background: "#15151B",
    color: "#fff",
    boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
    fontSize: 13,
  };
  const btn = (label: string, onClick: () => void, key?: string, active = false): React.ReactNode => (
    <button
      key={key ?? label}
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      style={{
        all: "unset",
        cursor: "pointer",
        padding: "4px 8px",
        borderRadius: 6,
        lineHeight: 1,
        background: active ? "rgba(255,255,255,0.18)" : "transparent",
      }}
    >
      {label}
    </button>
  );
  return (
    <div style={wrapStyle} onMouseDown={(e) => e.preventDefault()}>
      {btn("B", () => onCmd("bold"))}
      {btn("I", () => onCmd("italic"))}
      {btn("U", () => onCmd("underline"))}
      <Divider />
      {btn("H1", () => onBlock("h1"))}
      {btn("H2", () => onBlock("h2"))}
      {btn("P", () => onBlock("p"))}
      <Divider />
      {btn("🔗", () => { const url = window.prompt("Link URL"); if (url) onCmd("createLink", url); })}
      <Divider />
      {SWATCHES.map((c) => (
        <button
          key={`sw-${c}`}
          type="button"
          title={c}
          onMouseDown={(e) => { e.preventDefault(); onWrap({ color: c }); }}
          style={{
            all: "unset", cursor: "pointer", width: 16, height: 16, borderRadius: "50%",
            margin: "0 2px", border: "1px solid rgba(255,255,255,0.3)",
            background: c.startsWith("{") ? "var(--ds-color-brand,#6B66C9)" : c,
          }}
        />
      ))}
      <Divider />
      {GRADIENTS.map((g, i) => (
        <button
          key={`g-${i}`}
          type="button"
          title="Gradient text"
          onMouseDown={(e) => { e.preventDefault(); onWrap({ gradient: g }); }}
          style={{ all: "unset", cursor: "pointer", width: 18, height: 14, borderRadius: 4, margin: "0 2px", backgroundImage: g }}
        />
      ))}
      <Divider />
      {btn("A−", () => onWrap({ letterSpacing: -0.5 }), "ls-tight")}
      {btn("A+", () => onWrap({ letterSpacing: 1 }), "ls-wide")}
    </div>
  );
}

function Divider() {
  return <span style={{ width: 1, height: 18, background: "rgba(255,255,255,0.2)", margin: "0 2px" }} />;
}

function placeCaretEnd(el: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}
