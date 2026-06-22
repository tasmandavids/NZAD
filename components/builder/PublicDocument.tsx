// ============================================================================
//  components/builder/PublicDocument.tsx — store-independent read renderer.
//
//  Renders a BuilderDocument WITHOUT the editor store, so it is safe for SSR /
//  published output / shareable previews. Resolves styles at a chosen breakpoint
//  and applies animations via the framer-motion layer.
//
//  NOTE: production responsive output would compile per-breakpoint overrides into
//  a media-query stylesheet; this preview resolves at one active breakpoint.
// ============================================================================

"use client";

import { createElement, type CSSProperties, type ReactNode } from "react";
import type { BreakpointId, BuilderDocument, BuilderNode, NodeId } from "@/lib/builder/schema";
import { resolveStyle } from "@/lib/builder/cascade";
import { themeToCssVars } from "@/lib/builder/tokens";
import { RichTextView } from "./RichTextView";
import { AnimatedShell } from "./AnimatedShell";

export function PublicDocument({
  doc,
  breakpoint = "desktop",
}: {
  doc: BuilderDocument;
  breakpoint?: BreakpointId;
}) {
  const cssVars = themeToCssVars(doc.theme) as CSSProperties;
  return (
    <div style={{ ...cssVars, background: "var(--ds-color-base)", color: "var(--ds-color-body)", fontFamily: "var(--ds-font-body)", minHeight: "100vh" }}>
      <StaticNode doc={doc} id={doc.rootId} breakpoint={breakpoint} />
    </div>
  );
}

function StaticNode({ doc, id, breakpoint }: { doc: BuilderDocument; id: NodeId; breakpoint: BreakpointId }): ReactNode {
  const node = doc.nodes[id];
  if (!node || node.hidden) return null;

  const style = resolveStyle(node, { breakpoint, cascade: doc.cascade });
  const tag = node.type === "frame" && typeof node.props.as === "string" ? node.props.as : "div";
  const inner = renderInner(node, doc, breakpoint);

  if (node.animation) {
    return <AnimatedShell tag={tag} style={style} anim={node.animation} dataId={id}>{inner}</AnimatedShell>;
  }
  return createElement(tag, { style }, inner);
}

function renderInner(node: BuilderNode, doc: BuilderDocument, breakpoint: BreakpointId): ReactNode {
  const kids = () => node.children.map((cid) => <StaticNode key={cid} doc={doc} id={cid} breakpoint={breakpoint} />);
  switch (node.type) {
    case "frame":
    case "form":
      return kids();
    case "text":
      return <RichTextView rich={node.props.rich ?? [{ tag: node.props.tag ?? "p", runs: [{ text: "" }] }]} />;
    case "image":
      return node.props.src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={node.props.src} alt={node.props.alt ?? ""} style={{ display: "block", width: "100%", height: "100%", objectFit: "inherit", borderRadius: "inherit" }} />
      ) : null;
    case "video":
      return node.props.src ? (
        <video src={node.props.src} poster={node.props.poster} autoPlay={node.props.autoplay} loop={node.props.loop} muted={node.props.muted} controls={node.props.controls} playsInline style={{ display: "block", width: "100%", borderRadius: "inherit" }} />
      ) : null;
    case "button":
      return <a href={node.props.href ?? "#"} target={node.props.target} style={{ color: "inherit", textDecoration: "none" }}>{node.props.label ?? "Button"}</a>;
    case "icon":
      return <span>{node.props.glyph ?? "✦"}</span>;
    case "embed":
      return node.props.html ? <div dangerouslySetInnerHTML={{ __html: node.props.html }} /> : null;
    case "input":
      return node.props.fieldType === "textarea"
        ? <textarea placeholder={node.props.placeholder} style={{ all: "inherit", display: "block", minHeight: 96 }} />
        : <input type="text" placeholder={node.props.placeholder} style={{ all: "inherit", display: "block" }} />;
    default:
      return null;
  }
}
