// ============================================================================
//  lib/builder/schema.ts — Site Builder v2 document schema (deliverable #1)
//
//  This is the single source of truth for the visual builder's data model. It
//  is deliberately ISOLATED from the v1 site model (lib/site/*): the two never
//  import each other, so the new builder cannot regress the existing admin
//  portal or live sites.
//
//  Design pillars encoded here:
//    1. Hybrid layout  — every node is a container that can lay its children
//       out as flow / flex / grid (semantic) OR absolute (freeform). A child
//       carries its own self-positioning so the two modes compose.
//    2. Responsive      — a node has a BASE (desktop) StyleSet plus per-breakpoint
//       partial overrides. The cascade resolver (lib/builder/cascade.ts) merges
//       them desktop→mobile (or mobile→desktop) so overrides stay isolated.
//    3. Inline WYSIWYG  — `text` nodes store rich content as a portable inline
//       run model (no HTML soup) supporting per-character color/gradient.
//    4. Relational CMS  — any node can bind a prop to a collection field; a
//       `frame` can bind as a REPEATER to render once per collection item.
//    5. Design tokens   — colors/typography/radii/shadows live in `theme`. Style
//       values may reference a token via the `{group.name}` syntax, which the
//       cascade resolver compiles to a CSS custom property (var(--ds-…)). This
//       is what makes one-click reskinning instant and layout-shift-free.
//    6. Animation       — nodes carry an optional AnimationSpec (entrance /
//       scroll / hover) consumed by the framer-motion render layer.
//    7. Interaction states — hover / active / focus partial style overrides.
//
//  STORAGE NOTE: the node graph is NORMALIZED — a flat `nodes` dictionary keyed
//  by id, with parents holding ordered child-id arrays. This is the crux of the
//  performance strategy (see lib/builder/store.ts): mutating one node is an O(1)
//  write to a single map entry, so dragging/typing never re-clones a deep tree.
// ============================================================================

export const BUILDER_SCHEMA_VERSION = 2 as const;

// ─── Primitive value types ────────────────────────────────────────────────────

export type NodeId = string;

/** A CSS length. A bare number is treated as px. Strings pass through ("50%", "1fr", "auto"). */
export type Dim = string | number;

/**
 * A style value that may instead reference a design token. Token references use
 * the literal form `{group.name}` (e.g. `{color.brand}`, `{font.display}`,
 * `{radius.lg}`). The cascade resolver rewrites these to `var(--ds-group-name)`.
 */
export type TokenOr<T extends string | number> = T | (string & {});

export type Justify =
  | "flex-start" | "center" | "flex-end" | "space-between" | "space-around" | "space-evenly";
export type Align = "flex-start" | "center" | "flex-end" | "stretch" | "baseline";

export type LayoutMode = "flow" | "flex" | "grid" | "absolute";
export type PositionMode = "static" | "relative" | "absolute" | "sticky" | "fixed";

/** Per-edge box value; any omitted edge falls back to `all`. */
export interface BoxEdges {
  all?: Dim;
  top?: Dim;
  right?: Dim;
  bottom?: Dim;
  left?: Dim;
}

// ─── StyleSet — the full visual + layout surface of a node ──────────────────────

export interface StyleSet {
  // --- container: how THIS node arranges its children -----------------------
  layout?: LayoutMode;
  flexDirection?: "row" | "column" | "row-reverse" | "column-reverse";
  flexWrap?: "nowrap" | "wrap";
  justifyContent?: Justify;
  alignItems?: Align;
  alignContent?: Justify;
  gap?: Dim;
  gridTemplateColumns?: string;
  gridTemplateRows?: string;
  gridAutoFlow?: "row" | "column" | "row dense" | "column dense";
  gridAutoRows?: string;

  // --- self: how this node sits inside its parent ---------------------------
  position?: PositionMode;
  top?: Dim;
  right?: Dim;
  bottom?: Dim;
  left?: Dim;
  zIndex?: number;
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: Dim;
  alignSelf?: Align;
  gridColumn?: string;
  gridRow?: string;

  // --- box ------------------------------------------------------------------
  width?: Dim;
  height?: Dim;
  minWidth?: Dim;
  minHeight?: Dim;
  maxWidth?: Dim;
  maxHeight?: Dim;
  margin?: BoxEdges;
  padding?: BoxEdges;
  overflow?: "visible" | "hidden" | "auto" | "scroll" | "clip";
  aspectRatio?: string;

  // --- appearance -----------------------------------------------------------
  background?: TokenOr<string>;
  backgroundImage?: string;
  backgroundSize?: string;
  backgroundPosition?: string;
  color?: TokenOr<string>;
  opacity?: number;
  borderRadius?: TokenOr<Dim>;
  borderWidth?: Dim;
  borderStyle?: "none" | "solid" | "dashed" | "dotted";
  borderColor?: TokenOr<string>;
  boxShadow?: TokenOr<string>;
  backdropBlur?: number;
  objectFit?: "cover" | "contain" | "fill" | "none" | "scale-down";
  objectPosition?: string;

  // --- transform ------------------------------------------------------------
  rotate?: number; // degrees
  scale?: number;
  translateX?: Dim;
  translateY?: Dim;
  transformOrigin?: string;

  // --- typography (text + inheritable on containers) ------------------------
  fontFamily?: TokenOr<string>;
  fontSize?: TokenOr<Dim>;
  fontWeight?: number | string;
  fontStyle?: "normal" | "italic";
  lineHeight?: Dim;
  letterSpacing?: Dim;
  textAlign?: "left" | "center" | "right" | "justify";
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  textDecoration?: string;
  /** When set, renders text as a gradient via background-clip:text. */
  textGradient?: string;
  whiteSpace?: "normal" | "nowrap" | "pre" | "pre-wrap";
  cursor?: string;
}

/** The interaction states a node can override (pillar 6). */
export type InteractionState = "hover" | "active" | "focus";

// ─── Inline rich-text model (pillar 3) ──────────────────────────────────────────
//  Text content is stored as an array of styled runs rather than HTML so we can
//  drive per-character color/gradient/letter-spacing from the floating toolbar
//  and serialize losslessly. A run with no marks is plain text.

export interface TextMark {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  code?: boolean;
  /** Token ref or literal color for this run. */
  color?: TokenOr<string>;
  /** CSS gradient applied to this run via background-clip. */
  gradient?: string;
  letterSpacing?: Dim;
  link?: string;
  fontWeight?: number | string;
}

export interface TextRun {
  text: string;
  marks?: TextMark;
}

/** A paragraph / block-level line of inline runs. */
export interface RichBlock {
  /** h1..h3 render as headings, p as paragraph, li as list item. */
  tag?: "p" | "h1" | "h2" | "h3" | "h4" | "li" | "blockquote";
  runs: TextRun[];
}

export type RichText = RichBlock[];

// ─── CMS binding (pillar 4) ─────────────────────────────────────────────────────

export interface CmsBinding {
  collectionId: string;
  /**
   * "repeater" — this (frame) node renders once per collection item, exposing the
   *   item to descendant field bindings.
   * "field"    — this node's primary prop (text/src/href) is filled from `field`
   *   of the current repeater item.
   */
  mode: "repeater" | "field";
  /** Field key to read when mode === "field". */
  field?: string;
  /** Optional ordering / limit for repeaters. */
  sort?: { field: string; dir: "asc" | "desc" };
  limit?: number;
  /** Which prop the bound field fills (defaults sensibly per node type). */
  target?: "text" | "src" | "href" | "alt" | "background";
}

// ─── Animation (pillar 6) ───────────────────────────────────────────────────────

export type AnimTrigger = "load" | "inview" | "hover" | "scroll";

export interface AnimationSpec {
  trigger: AnimTrigger;
  /** Named preset; `custom` uses the explicit from/to below. */
  preset?:
    | "fade" | "fade-up" | "fade-down" | "fade-left" | "fade-right"
    | "zoom-in" | "zoom-out" | "blur-in" | "slide-up" | "custom";
  from?: Partial<StyleSet>;
  to?: Partial<StyleSet>;
  duration?: number; // seconds
  delay?: number;
  ease?: "linear" | "easeIn" | "easeOut" | "easeInOut" | string;
  /** Stagger children (for repeaters / lists), seconds between each. */
  stagger?: number;
  /** Replay every time the element re-enters the viewport. */
  once?: boolean;
}

// ─── Node types ─────────────────────────────────────────────────────────────────

export type NodeType =
  // structural
  | "frame" // generic container (section / div / grid / flex / absolute canvas)
  // leaves
  | "text"
  | "image"
  | "button"
  | "video"
  | "icon"
  | "embed"
  | "divider"
  | "spacer"
  // functional "app-market" blocks (pillar 7) — render via dedicated components
  | "form"
  | "input"
  | "productLoop"
  | "booking";

/** Loose, per-type content bag. Typed accessors live in lib/builder/props.ts. */
export interface NodeProps {
  // text
  rich?: RichText;
  tag?: RichBlock["tag"];
  // image / video
  src?: string;
  alt?: string;
  poster?: string;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
  // button / link
  label?: string;
  href?: string;
  target?: "_self" | "_blank";
  // icon
  glyph?: string;
  // embed
  html?: string;
  // form / input
  fieldName?: string;
  fieldType?: "text" | "email" | "tel" | "textarea" | "select" | "checkbox";
  placeholder?: string;
  required?: boolean;
  options?: string[];
  submitLabel?: string;
  endpoint?: string; // server action / webhook key
  // productLoop / booking
  source?: string;
  limit?: number;
  // semantic element override (section/header/nav/footer/article…)
  as?: string;
  [key: string]: unknown;
}

export interface BuilderNode {
  id: NodeId;
  type: NodeType;
  /** Human label shown in the layers panel. */
  name: string;
  parent: NodeId | null;
  children: NodeId[];

  /** Base (desktop) styles. */
  style: StyleSet;
  /** Per-breakpoint partial overrides (cascade applied at resolve time). */
  responsive?: Partial<Record<BreakpointId, Partial<StyleSet>>>;
  /** Interaction-state partial overrides. */
  states?: Partial<Record<InteractionState, Partial<StyleSet>>>;

  props: NodeProps;
  binding?: CmsBinding;
  animation?: AnimationSpec;

  locked?: boolean;
  hidden?: boolean;
}

// ─── Breakpoints (pillar 2) ─────────────────────────────────────────────────────

export type BreakpointId = "desktop" | "tablet" | "mobileL" | "mobileP";

export interface Breakpoint {
  id: BreakpointId;
  label: string;
  /** Canvas width used when this breakpoint is active, px. */
  width: number;
  /** Max-width media query bound (desktop = base, no query). */
  maxWidth?: number;
  icon: "desktop" | "tablet" | "mobile";
}

/** Ordered widest→narrowest. Desktop is the base layer of the cascade. */
export const BREAKPOINTS: Breakpoint[] = [
  { id: "desktop", label: "Desktop", width: 1280, icon: "desktop" },
  { id: "tablet", label: "Tablet", width: 834, maxWidth: 991, icon: "tablet" },
  { id: "mobileL", label: "Mobile landscape", width: 568, maxWidth: 767, icon: "mobile" },
  { id: "mobileP", label: "Mobile portrait", width: 390, maxWidth: 478, icon: "mobile" },
];

export const BREAKPOINT_ORDER: BreakpointId[] = BREAKPOINTS.map((b) => b.id);

// ─── Design tokens / theme (pillar 5) ───────────────────────────────────────────

export interface ThemeTokens {
  color: Record<string, string>;
  font: Record<string, string>;
  fontSize: Record<string, string>;
  radius: Record<string, string>;
  shadow: Record<string, string>;
  space: Record<string, string>;
  /** Light/dark base affects default surface/ink fallbacks. */
  base: "light" | "dark";
}

// ─── CMS collection definitions (pillar 4) ──────────────────────────────────────

export type CmsFieldType =
  | "text" | "richText" | "number" | "boolean" | "image" | "url" | "date" | "reference" | "option";

export interface CmsField {
  key: string;
  label: string;
  type: CmsFieldType;
  /** For reference fields: the referenced collection id. */
  refCollectionId?: string;
  options?: string[];
}

export interface CmsItem {
  id: string;
  fields: Record<string, unknown>;
}

export interface CmsCollection {
  id: string;
  name: string;
  /** url slug used for generated dynamic pages, e.g. "team" → /team/[slug]. */
  slug: string;
  fields: CmsField[];
  items: CmsItem[];
}

// ─── The document ───────────────────────────────────────────────────────────────

export interface PageMeta {
  title: string;
  slug: string;
  seoTitle?: string;
  seoDescription?: string;
  /** When set, this page is the dynamic template for a collection. */
  collectionTemplateId?: string;
}

export interface BuilderDocument {
  version: typeof BUILDER_SCHEMA_VERSION;
  id: string;
  rootId: NodeId;
  nodes: Record<NodeId, BuilderNode>;
  theme: ThemeTokens;
  breakpoints: Breakpoint[];
  collections: CmsCollection[];
  meta: PageMeta;
  /** Desktop-first (default) cascades wide→narrow; mobile-first narrow→wide. */
  cascade: "desktop-first" | "mobile-first";
}
