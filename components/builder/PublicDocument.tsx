// ============================================================================
//  components/builder/PublicDocument.tsx — store-independent SSR renderer.
//
//  Renders a BuilderDocument WITHOUT the editor store, as a SERVER component, so
//  it is safe for the published live site / SEO / shareable previews. Unlike the
//  editor canvas (which resolves one active breakpoint inline), this emits a real
//  media-query stylesheet (lib/builder/stylesheet.ts) so the page adapts across
//  desktop / tablet / mobile for actual visitors. Nodes carry only a `b-<id>`
//  class; all styling lives in the compiled <style>. framer-motion stays a client
//  island (AnimatedShell) wrapping only the nodes that declare an animation.
// ============================================================================

import { createElement, type CSSProperties, type ReactNode } from "react";
import type { BuilderDocument, BuilderNode, NodeId } from "@/lib/builder/schema";
import { themeToCssVars } from "@/lib/builder/tokens";
import { buildDocumentStylesheet, nodeClassName } from "@/lib/builder/stylesheet";
import { sanitizeEmbedHtml } from "@/lib/builder/sanitize";
import { RichTextView } from "./RichTextView";
import { AnimatedShell } from "./AnimatedShell";

export function PublicDocument({ doc }: { doc: BuilderDocument }) {
  const cssVars = themeToCssVars(doc.theme) as CSSProperties;
  const sheet = buildDocumentStylesheet(doc);
  return (
    <div
      style={{
        ...cssVars,
        background: "var(--ds-color-base)",
        color: "var(--ds-color-body)",
        fontFamily: "var(--ds-font-body)",
        minHeight: "100vh",
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: sheet }} />
      <StaticNode doc={doc} id={doc.rootId} />
    </div>
  );
}

function StaticNode({ doc, id }: { doc: BuilderDocument; id: NodeId }): ReactNode {
  const node = doc.nodes[id];
  if (!node || node.hidden) return null;

  const className = nodeClassName(id);
  const tag = node.type === "frame" && typeof node.props.as === "string" ? node.props.as : "div";
  const inner = renderInner(node, doc);

  if (node.animation) {
    return (
      <AnimatedShell tag={tag} className={className} anim={node.animation} dataId={id}>
        {inner}
      </AnimatedShell>
    );
  }
  return createElement(tag, { className, "data-builder-node": id }, inner);
}

function renderInner(node: BuilderNode, doc: BuilderDocument): ReactNode {
  const kids = () => node.children.map((cid) => <StaticNode key={cid} doc={doc} id={cid} />);
  switch (node.type) {
    case "frame":
    case "form":
      return kids();
    case "text":
      return <RichTextView rich={node.props.rich ?? [{ tag: node.props.tag ?? "p", runs: [{ text: "" }] }]} />;
    case "image":
      return node.props.src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={node.props.src}
          alt={node.props.alt ?? ""}
          loading="lazy"
          decoding="async"
          style={{ display: "block", width: "100%", height: "100%", objectFit: "inherit", borderRadius: "inherit" }}
        />
      ) : null;
    case "video":
      return node.props.src ? (
        <video
          src={node.props.src}
          poster={node.props.poster}
          autoPlay={node.props.autoplay}
          loop={node.props.loop}
          muted={node.props.muted}
          controls={node.props.controls}
          playsInline
          style={{ display: "block", width: "100%", borderRadius: "inherit" }}
        />
      ) : null;
    case "button":
      return (
        <a href={node.props.href ?? "#"} target={node.props.target} style={{ color: "inherit", textDecoration: "none" }}>
          {node.props.label ?? "Button"}
        </a>
      );
    case "icon":
      return <span>{node.props.glyph ?? "✦"}</span>;
    case "embed":
      return node.props.html ? <div dangerouslySetInnerHTML={{ __html: sanitizeEmbedHtml(node.props.html) }} /> : null;
    case "input":
      return node.props.fieldType === "textarea" ? (
        <textarea placeholder={node.props.placeholder} style={{ all: "inherit", display: "block", minHeight: 96 }} />
      ) : (
        <input
          type={node.props.fieldType === "email" ? "email" : node.props.fieldType === "tel" ? "tel" : "text"}
          placeholder={node.props.placeholder}
          style={{ all: "inherit", display: "block" }}
        />
      );
    default:
      return null;
  }
}
