// ============================================================================
//  lib/builder/tree.ts — author nested node trees ergonomically, then flatten
//  them into the normalized document shape. Used by the starter templates.
// ============================================================================

import {
  type AnimationSpec,
  type BreakpointId,
  type BuilderDocument,
  type BuilderNode,
  type NodeProps,
  type NodeType,
  type PageMeta,
  type StyleSet,
  type ThemeTokens,
  BUILDER_SCHEMA_VERSION,
  BREAKPOINTS,
} from "./schema";
import { createNode } from "./defaults";
import { DEFAULT_THEME } from "./tokens";

export interface TreeSpec {
  type: NodeType;
  name?: string;
  style?: StyleSet;
  responsive?: Partial<Record<BreakpointId, Partial<StyleSet>>>;
  props?: NodeProps;
  animation?: AnimationSpec;
  children?: TreeSpec[];
}

function flatten(spec: TreeSpec, parent: string | null, out: Record<string, BuilderNode>): BuilderNode {
  const node = createNode(spec.type, {
    name: spec.name,
    style: spec.style,
    responsive: spec.responsive,
    props: spec.props,
    animation: spec.animation,
    parent,
  });
  out[node.id] = node;
  node.children = (spec.children ?? []).map((c) => flatten(c, node.id, out).id);
  return node;
}

export function documentFromTree(
  meta: PageMeta,
  spec: TreeSpec,
  theme: ThemeTokens = DEFAULT_THEME,
): BuilderDocument {
  const nodes: Record<string, BuilderNode> = {};
  const root = flatten(spec, null, nodes);
  return {
    version: BUILDER_SCHEMA_VERSION,
    id: `doc_${root.id}`,
    rootId: root.id,
    nodes,
    theme,
    breakpoints: BREAKPOINTS,
    collections: [],
    meta,
    cascade: "desktop-first",
  };
}

// ─── convenience spec builders ──────────────────────────────────────────────────

export function heading(text: string, style?: StyleSet, level: "h1" | "h2" | "h3" = "h2"): TreeSpec {
  return {
    type: "text",
    name: "Heading",
    props: { rich: [{ tag: level, runs: [{ text }] }], tag: level },
    style: { fontFamily: "{font.display}", color: "{color.ink}", lineHeight: 1.1, ...style },
  };
}

export function paragraph(text: string, style?: StyleSet): TreeSpec {
  return {
    type: "text",
    name: "Text",
    props: { rich: [{ tag: "p", runs: [{ text }] }], tag: "p" },
    style: { fontFamily: "{font.body}", color: "{color.body}", fontSize: "{fontSize.lg}", lineHeight: 1.6, ...style },
  };
}

export function button(label: string, href = "#", style?: StyleSet): TreeSpec {
  return { type: "button", props: { label, href }, style };
}

export function section(style: StyleSet, children: TreeSpec[], name = "Section"): TreeSpec {
  return {
    type: "frame",
    name,
    props: { as: "section" },
    style: { layout: "flex", flexDirection: "column", alignItems: "center", gap: 24, width: "100%", padding: { top: 96, bottom: 96, left: 24, right: 24 }, ...style },
    children,
  };
}
