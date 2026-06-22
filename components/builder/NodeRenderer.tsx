// ============================================================================
//  components/builder/NodeRenderer.tsx — recursive canvas renderer (deliverable #3)
//
//  This is the boilerplate the prompt asks for: the component that parses the
//  builder JSON (a node from the normalized graph) and renders an interactive,
//  inline-editable, draggable element, recursing into children.
//
//  Each instance subscribes to ONLY its own node (`useNode(id)`) plus the small
//  scalar slices it needs. Because Immer preserves identity for untouched nodes,
//  mutating one node re-renders only that node's renderer — this is the crux of
//  the "no canvas lag" guarantee.
// ============================================================================

"use client";

import { createElement, memo, type CSSProperties, type ReactNode } from "react";
import type { BuilderNode, NodeId } from "@/lib/builder/schema";
import { resolveStyle } from "@/lib/builder/cascade";
import { sanitizeEmbedHtml } from "@/lib/builder/sanitize";
import { useBuilder, useNode } from "@/lib/builder/store";
import { RichTextView } from "./RichTextView";
import { InlineText } from "./InlineText";
import { AnimatedShell } from "./AnimatedShell";

interface RenderProps {
  id: NodeId;
  editable: boolean;
}

export const NodeRenderer = memo(function NodeRenderer({ id, editable }: RenderProps) {
  const node = useNode(id);
  const breakpoint = useBuilder((s) => s.breakpoint);
  const cascade = useBuilder((s) => s.doc.cascade);
  const selected = useBuilder((s) => s.selection.includes(id));
  const hovered = useBuilder((s) => s.hoverId === id);
  const editing = useBuilder((s) => s.editingId === id);

  if (!node) return null;
  if (node.hidden && !editable) return null;

  const css = resolveStyle(node, { breakpoint, cascade });

  // Editor affordances: outline on hover/selection, dashed for empty frames.
  const editorStyle: CSSProperties = editable
    ? {
        outline: selected
          ? "2px solid #6B66C9"
          : hovered
            ? "1.5px solid rgba(107,102,201,0.5)"
            : node.type === "frame" && node.children.length === 0
              ? "1px dashed rgba(107,102,201,0.4)"
              : undefined,
        outlineOffset: selected ? 0 : -1,
        opacity: node.hidden ? 0.4 : css.opacity,
        position: css.position ?? (node.type === "frame" ? "relative" : undefined),
      }
    : {};

  const handlers = editable
    ? {
        "data-builder-node": id,
        "data-builder-frame": node.type === "frame" ? "true" : undefined,
        onMouseDown: (e: React.MouseEvent) => {
          e.stopPropagation();
          if (node.locked) return;
          useBuilder.getState().select(id, e.shiftKey);
        },
        onMouseEnter: (e: React.MouseEvent) => { e.stopPropagation(); useBuilder.getState().setHover(id); },
        onMouseLeave: (e: React.MouseEvent) => { e.stopPropagation(); useBuilder.getState().setHover(null); },
        onDoubleClick: (e: React.MouseEvent) => {
          if (node.type === "text") { e.stopPropagation(); useBuilder.getState().setEditing(id); }
        },
      }
    : { "data-builder-node": id };

  const style: CSSProperties = { ...css, ...editorStyle };
  const inner = renderInner(node, editable, editing);

  const tag =
    node.type === "frame" && typeof node.props.as === "string" ? node.props.as : "div";

  // Animations only run outside the editor (preview / published).
  if (!editable && node.animation) {
    return (
      <AnimatedShell tag={tag} style={style} anim={node.animation} dataId={id}>
        {inner}
      </AnimatedShell>
    );
  }

  return createElement(tag, { style, ...handlers }, inner);
});

function renderInner(node: BuilderNode, editable: boolean, editing: boolean): ReactNode {
  switch (node.type) {
    case "frame":
      return node.children.map((cid) => <NodeRenderer key={cid} id={cid} editable={editable} />);

    case "text":
      if (editable && editing) {
        return <InlineText id={node.id} defaultTag={node.props.tag ?? "p"} />;
      }
      return <RichTextView rich={node.props.rich ?? [{ tag: node.props.tag ?? "p", runs: [{ text: "" }] }]} />;

    case "image":
      return node.props.src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={node.props.src} alt={node.props.alt ?? ""} style={{ display: "block", width: "100%", height: "100%", objectFit: "inherit", borderRadius: "inherit" }} />
      ) : (
        <Placeholder label="Image" editable={editable} />
      );

    case "video":
      return node.props.src ? (
        <video
          src={node.props.src}
          poster={node.props.poster}
          autoPlay={!editable && node.props.autoplay}
          loop={node.props.loop}
          muted={node.props.muted}
          controls={node.props.controls}
          playsInline
          style={{ display: "block", width: "100%", borderRadius: "inherit" }}
        />
      ) : (
        <Placeholder label="Video" editable={editable} />
      );

    case "button":
      return editable ? (
        <span>{node.props.label ?? "Button"}</span>
      ) : (
        <a href={node.props.href ?? "#"} target={node.props.target} style={{ color: "inherit", textDecoration: "none" }}>
          {node.props.label ?? "Button"}
        </a>
      );

    case "icon":
      return <span>{node.props.glyph ?? "✦"}</span>;

    case "divider":
    case "spacer":
      return null;

    case "embed":
      return node.props.html && !editable ? (
        <div dangerouslySetInnerHTML={{ __html: sanitizeEmbedHtml(node.props.html) }} />
      ) : (
        <Placeholder label="Embed / HTML" editable={editable} />
      );

    case "input":
      return node.props.fieldType === "textarea" ? (
        <textarea placeholder={node.props.placeholder} style={{ all: "inherit", display: "block", minHeight: 96, resize: "vertical" }} disabled={editable} />
      ) : (
        <input
          type={node.props.fieldType === "email" ? "email" : node.props.fieldType === "tel" ? "tel" : "text"}
          placeholder={node.props.placeholder}
          style={{ all: "inherit", display: "block" }}
          disabled={editable}
        />
      );

    case "form":
      return node.children.map((cid) => <NodeRenderer key={cid} id={cid} editable={editable} />);

    case "productLoop":
      return Array.from({ length: Math.min(6, node.props.limit ?? 6) }).map((_, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ aspectRatio: "1", background: "var(--ds-color-surfacealt,#f0eefb)", borderRadius: "var(--ds-radius-md,12px)" }} />
          <div style={{ height: 12, width: "70%", background: "rgba(0,0,0,0.08)", borderRadius: 4 }} />
          <div style={{ height: 12, width: "40%", background: "rgba(0,0,0,0.08)", borderRadius: 4 }} />
        </div>
      ));

    case "booking":
      return Array.from({ length: Math.min(4, node.props.limit ?? 4) }).map((_, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 16, border: "1px solid var(--ds-color-line,#e6e4f0)", borderRadius: "var(--ds-radius-md,12px)" }}>
          <span style={{ fontWeight: 600 }}>Class slot {i + 1}</span>
          <span style={{ padding: "6px 14px", background: "var(--ds-color-brand,#6B66C9)", color: "#fff", borderRadius: 999, fontSize: 13 }}>Book</span>
        </div>
      ));

    default:
      return null;
  }
}

function Placeholder({ label, editable }: { label: string; editable: boolean }) {
  if (!editable) return null;
  return (
    <div
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: "100%", minHeight: 120, aspectRatio: "16/10",
        background: "rgba(107,102,201,0.06)", color: "rgba(107,102,201,0.8)",
        fontSize: 13, borderRadius: "inherit", border: "1px dashed rgba(107,102,201,0.4)",
      }}
    >
      {label}
    </div>
  );
}
