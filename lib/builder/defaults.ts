// ============================================================================
//  lib/builder/defaults.ts — node factories + the insertable component library.
//
//  createNode() stamps a fresh node with sensible default styles/props for its
//  type. COMPONENT_LIBRARY drives the left-hand insert palette: each entry knows
//  how to build a subtree, which is dropped onto the canvas as a unit.
// ============================================================================

import type {
  BuilderNode,
  NodeId,
  NodeProps,
  NodeType,
  RichText,
  StyleSet,
} from "./schema";

export function newId(prefix = "n"): NodeId {
  // crypto.randomUUID is available in modern browsers and Node 18+.
  const uuid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${uuid}`;
}

export function richText(text: string, tag: RichText[number]["tag"] = "p"): RichText {
  return [{ tag, runs: [{ text }] }];
}

const DEFAULT_STYLE: Record<NodeType, StyleSet> = {
  frame: { layout: "flex", flexDirection: "column", gap: 16, padding: { all: 0 } },
  text: { fontFamily: "{font.body}", fontSize: "{fontSize.base}", color: "{color.body}", lineHeight: 1.6 },
  image: { width: "100%", borderRadius: "{radius.md}", objectFit: "cover" },
  button: {
    layout: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: { top: 12, bottom: 12, left: 24, right: 24 },
    background: "{color.brand}",
    color: "{color.inverse}",
    borderRadius: "{radius.full}",
    fontFamily: "{font.body}",
    fontWeight: 600,
    cursor: "pointer",
  },
  video: { width: "100%", borderRadius: "{radius.md}" },
  icon: { fontSize: "{fontSize.2xl}", color: "{color.brand}" },
  embed: { width: "100%", minHeight: 200 },
  divider: { width: "100%", height: 1, background: "{color.line}" },
  spacer: { width: "100%", height: 48 },
  form: { layout: "flex", flexDirection: "column", gap: 16, width: "100%" },
  input: {
    width: "100%",
    padding: { top: 12, bottom: 12, left: 16, right: 16 },
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "{color.line}",
    borderRadius: "{radius.md}",
    background: "{color.surface}",
    color: "{color.ink}",
    fontFamily: "{font.body}",
  },
  productLoop: { layout: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, width: "100%" },
  booking: { layout: "flex", flexDirection: "column", gap: 16, width: "100%" },
};

const DEFAULT_PROPS: Partial<Record<NodeType, NodeProps>> = {
  text: { rich: richText("Edit this text", "p") },
  button: { label: "Get started", href: "#", target: "_self" },
  image: { src: "", alt: "" },
  video: { src: "", controls: true, muted: true },
  icon: { glyph: "✦" },
  embed: { html: "" },
  input: { fieldType: "text", fieldName: "field", placeholder: "Your answer", required: false },
  form: { submitLabel: "Submit", endpoint: "default" },
  productLoop: { source: "products", limit: 6 },
  booking: { source: "classes", limit: 6 },
};

export function createNode(
  type: NodeType,
  overrides: Partial<Omit<BuilderNode, "id" | "type">> = {},
): BuilderNode {
  return {
    id: newId(type === "frame" ? "frame" : type),
    type,
    name: overrides.name ?? defaultName(type),
    parent: overrides.parent ?? null,
    children: overrides.children ?? [],
    style: { ...DEFAULT_STYLE[type], ...overrides.style },
    responsive: overrides.responsive,
    states: overrides.states,
    props: { ...DEFAULT_PROPS[type], ...overrides.props },
    binding: overrides.binding,
    animation: overrides.animation,
    locked: overrides.locked,
    hidden: overrides.hidden,
  };
}

function defaultName(type: NodeType): string {
  const map: Record<NodeType, string> = {
    frame: "Frame",
    text: "Text",
    image: "Image",
    button: "Button",
    video: "Video",
    icon: "Icon",
    embed: "Embed",
    divider: "Divider",
    spacer: "Spacer",
    form: "Form",
    input: "Input",
    productLoop: "Product grid",
    booking: "Booking",
  };
  return map[type];
}

// ─── Insert palette ─────────────────────────────────────────────────────────────

export interface ComponentDef {
  key: string;
  label: string;
  group: "Layout" | "Basic" | "Media" | "Forms" | "Commerce";
  icon: string;
  /** Build a detached subtree; returns the root node plus any descendants. */
  build: () => { root: BuilderNode; extra?: BuilderNode[] };
}

export const COMPONENT_LIBRARY: ComponentDef[] = [
  {
    key: "section",
    label: "Section",
    group: "Layout",
    icon: "▭",
    build: () => ({
      root: createNode("frame", {
        name: "Section",
        props: { as: "section" },
        style: {
          layout: "flex",
          flexDirection: "column",
          gap: 24,
          padding: { top: 96, bottom: 96, left: 24, right: 24 },
          width: "100%",
          alignItems: "center",
        },
      }),
    }),
  },
  {
    key: "stack",
    label: "Stack (flex)",
    group: "Layout",
    icon: "≡",
    build: () => ({
      root: createNode("frame", {
        name: "Stack",
        style: { layout: "flex", flexDirection: "column", gap: 16, padding: { all: 16 } },
      }),
    }),
  },
  {
    key: "row",
    label: "Row (flex)",
    group: "Layout",
    icon: "⋮⋮",
    build: () => ({
      root: createNode("frame", {
        name: "Row",
        style: { layout: "flex", flexDirection: "row", gap: 16, alignItems: "center", padding: { all: 16 } },
      }),
    }),
  },
  {
    key: "grid",
    label: "Grid",
    group: "Layout",
    icon: "▦",
    build: () => ({
      root: createNode("frame", {
        name: "Grid",
        style: { layout: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, padding: { all: 16 } },
      }),
    }),
  },
  {
    key: "canvas",
    label: "Free canvas",
    group: "Layout",
    icon: "✛",
    build: () => ({
      root: createNode("frame", {
        name: "Free canvas",
        style: { layout: "absolute", width: "100%", height: 360, background: "{color.surfaceAlt}", borderRadius: "{radius.lg}" },
      }),
    }),
  },
  {
    key: "heading",
    label: "Heading",
    group: "Basic",
    icon: "H",
    build: () => ({
      root: createNode("text", {
        name: "Heading",
        props: { rich: richText("Your headline here", "h2"), tag: "h2" },
        style: { fontFamily: "{font.display}", fontSize: "{fontSize.4xl}", fontWeight: 600, color: "{color.ink}", lineHeight: 1.1 },
      }),
    }),
  },
  {
    key: "paragraph",
    label: "Text",
    group: "Basic",
    icon: "¶",
    build: () => ({ root: createNode("text", { name: "Text" }) }),
  },
  { key: "button", label: "Button", group: "Basic", icon: "⬚", build: () => ({ root: createNode("button") }) },
  { key: "divider", label: "Divider", group: "Basic", icon: "—", build: () => ({ root: createNode("divider") }) },
  { key: "spacer", label: "Spacer", group: "Basic", icon: "␣", build: () => ({ root: createNode("spacer") }) },
  { key: "icon", label: "Icon", group: "Basic", icon: "✦", build: () => ({ root: createNode("icon") }) },
  { key: "image", label: "Image", group: "Media", icon: "🖼", build: () => ({ root: createNode("image") }) },
  { key: "video", label: "Video", group: "Media", icon: "▶", build: () => ({ root: createNode("video") }) },
  { key: "embed", label: "Embed / HTML", group: "Media", icon: "</>", build: () => ({ root: createNode("embed") }) },
  {
    key: "form",
    label: "Contact form",
    group: "Forms",
    icon: "✉",
    build: () => {
      const name = createNode("input", { props: { fieldType: "text", fieldName: "name", placeholder: "Name", required: true } });
      const email = createNode("input", { props: { fieldType: "email", fieldName: "email", placeholder: "Email", required: true } });
      const msg = createNode("input", { props: { fieldType: "textarea", fieldName: "message", placeholder: "Message" } });
      const submit = createNode("button", { name: "Submit", props: { label: "Send" } });
      const form = createNode("form", { children: [name.id, email.id, msg.id, submit.id] });
      [name, email, msg, submit].forEach((c) => (c.parent = form.id));
      return { root: form, extra: [name, email, msg, submit] };
    },
  },
  { key: "input", label: "Input field", group: "Forms", icon: "▭", build: () => ({ root: createNode("input") }) },
  { key: "productLoop", label: "Product grid", group: "Commerce", icon: "🛍", build: () => ({ root: createNode("productLoop") }) },
  { key: "booking", label: "Booking block", group: "Commerce", icon: "📅", build: () => ({ root: createNode("booking") }) },
];

export const COMPONENT_GROUPS = ["Layout", "Basic", "Media", "Forms", "Commerce"] as const;
