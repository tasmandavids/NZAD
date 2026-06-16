// ============================================================================
//  lib/site/blocks.ts — the custom site-builder block model.
//
//  Single source of truth for:
//    • the block TYPES a studio can place on a page
//    • each block's DEFAULT props (used when adding a block)
//    • each block's editable FIELD schema (drives the generic editor UI)
//
//  A page's `blocks` column is an ordered array of `Block` objects. Block props
//  are stored loosely (JSON) but every block component reads them through the
//  typed helpers in lib/site/props.ts, so we avoid `any` while keeping the
//  editor generic.
// ============================================================================

export type BlockType =
  | "hero"
  | "richText"
  | "features"
  | "classGrid"
  | "gallery"
  | "testimonials"
  | "cta"
  | "faq"
  | "contact";

/** A repeated sub-item (feature, testimonial, faq row, gallery image…). */
export type BlockItem = Record<string, string>;

/** A single prop value. Lists hold arrays of string-keyed items. */
export type PropValue = string | number | boolean | BlockItem[];

export type BlockProps = Record<string, PropValue>;

export type Block = {
  id: string;
  type: BlockType;
  props: BlockProps;
};

// ─── Field schema (drives the editor's auto-generated forms) ──────────────────

export type FieldType =
  | "text"
  | "textarea"
  | "url"
  | "image"
  | "number"
  | "boolean"
  | "select"
  | "list";

export type SelectOption = { value: string; label: string };

export type FieldDef = {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  help?: string;
  /** For `select` fields: the available options. */
  options?: SelectOption[];
  /** For `list` fields: the schema of each item. */
  itemFields?: FieldDef[];
  /** For `list` fields: default props for a freshly-added item. */
  itemDefault?: BlockItem;
};

export type BlockDef = {
  type: BlockType;
  label: string;
  description: string;
  defaultProps: BlockProps;
  fields: FieldDef[];
  /** Whether this block exposes the shared appearance controls (bg + spacing). */
  appearance?: boolean;
};

// ─── Shared appearance (section background + vertical spacing) ─────────────────
//  These props are stored under reserved `_bg` / `_spacing` keys on any block
//  flagged `appearance: true`. BlockRenderer's <BlockShell> reads them.

export const APPEARANCE_FIELDS: FieldDef[] = [
  {
    key: "_bg",
    label: "Section background",
    type: "select",
    options: [
      { value: "base", label: "Page background" },
      { value: "surface", label: "Card / surface" },
      { value: "tint", label: "Brand tint" },
    ],
  },
  {
    key: "_spacing",
    label: "Vertical spacing",
    type: "select",
    options: [
      { value: "compact", label: "Compact" },
      { value: "normal", label: "Normal" },
      { value: "spacious", label: "Spacious" },
    ],
  },
];

/** Default appearance per block type (preserves the original look of each). */
export const APPEARANCE_DEFAULTS: Partial<Record<BlockType, { _bg: string; _spacing: string }>> = {
  richText: { _bg: "base", _spacing: "normal" },
  features: { _bg: "surface", _spacing: "normal" },
  classGrid: { _bg: "base", _spacing: "normal" },
  gallery: { _bg: "base", _spacing: "normal" },
  testimonials: { _bg: "surface", _spacing: "normal" },
  faq: { _bg: "base", _spacing: "normal" },
  contact: { _bg: "surface", _spacing: "normal" },
};

// ─── Block definitions ────────────────────────────────────────────────────────

export const BLOCK_LIBRARY: BlockDef[] = [
  {
    type: "hero",
    label: "Hero",
    description: "Full-width headline, subtext and call-to-action buttons.",
    defaultProps: {
      eyebrow: "Welcome",
      heading: "Move with purpose.",
      subheading: "World-class instruction in a space built for you.",
      primaryLabel: "Book a trial",
      primaryHref: "/enrol",
      secondaryLabel: "View classes",
      secondaryHref: "/programmes",
      imageUrl: "",
      align: "center",
    },
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "heading", label: "Heading", type: "text" },
      { key: "subheading", label: "Subheading", type: "textarea" },
      { key: "primaryLabel", label: "Primary button label", type: "text" },
      { key: "primaryHref", label: "Primary button link", type: "text" },
      { key: "secondaryLabel", label: "Secondary button label", type: "text" },
      { key: "secondaryHref", label: "Secondary button link", type: "text" },
      { key: "imageUrl", label: "Background image URL", type: "image", help: "Optional. Leave blank for a clean gradient." },
      { key: "align", label: "Alignment (left/center)", type: "text" },
    ],
  },
  {
    type: "richText",
    label: "Text section",
    appearance: true,
    description: "A heading and rich text — supports lists, links and **bold**.",
    defaultProps: {
      heading: "About us",
      body: "Tell your story here. What makes your studio special?\n\nUse a blank line for a new paragraph, `- ` for bullet lists, `1. ` for numbered lists, **bold** for emphasis, and [links](https://example.com).",
      align: "left",
    },
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      {
        key: "body",
        label: "Body",
        type: "textarea",
        help: "Markdown-lite: blank line = new paragraph · `- ` bullets · `1. ` numbered · **bold** · [text](url).",
      },
      {
        key: "align",
        label: "Alignment",
        type: "select",
        options: [
          { value: "left", label: "Left" },
          { value: "center", label: "Center" },
        ],
      },
    ],
  },
  {
    type: "features",
    label: "Feature grid",
    appearance: true,
    description: "Three-up grid of icon/title/description cards.",
    defaultProps: {
      heading: "Why train with us",
      items: [
        { icon: "✦", title: "Expert instructors", text: "Learn from working professionals." },
        { icon: "✦", title: "Small classes", text: "Personal attention for every student." },
        { icon: "✦", title: "All levels", text: "From first steps to advanced technique." },
      ],
    },
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      {
        key: "items",
        label: "Features",
        type: "list",
        itemDefault: { icon: "✦", title: "New feature", text: "Describe it." },
        itemFields: [
          { key: "icon", label: "Icon / emoji", type: "text" },
          { key: "title", label: "Title", type: "text" },
          { key: "text", label: "Description", type: "textarea" },
        ],
      },
    ],
  },
  {
    type: "classGrid",
    label: "Class showcase",
    appearance: true,
    description: "Automatically lists your studio's classes.",
    defaultProps: {
      heading: "Our classes",
      subheading: "Find the right fit for you.",
      limit: 6,
    },
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "subheading", label: "Subheading", type: "text" },
      { key: "limit", label: "Max classes to show", type: "number" },
    ],
  },
  {
    type: "gallery",
    label: "Image gallery",
    appearance: true,
    description: "Responsive grid of images.",
    defaultProps: {
      heading: "Gallery",
      items: [
        { imageUrl: "", caption: "" },
        { imageUrl: "", caption: "" },
        { imageUrl: "", caption: "" },
      ],
    },
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      {
        key: "items",
        label: "Images",
        type: "list",
        itemDefault: { imageUrl: "", caption: "" },
        itemFields: [
          { key: "imageUrl", label: "Image URL", type: "image" },
          { key: "caption", label: "Caption", type: "text" },
        ],
      },
    ],
  },
  {
    type: "testimonials",
    label: "Testimonials",
    appearance: true,
    description: "Quotes from happy students and parents.",
    defaultProps: {
      heading: "What families say",
      items: [
        { quote: "Our daughter has flourished here.", author: "A happy parent" },
        { quote: "The best studio in town, hands down.", author: "A student" },
      ],
    },
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      {
        key: "items",
        label: "Quotes",
        type: "list",
        itemDefault: { quote: "Add a quote.", author: "Name" },
        itemFields: [
          { key: "quote", label: "Quote", type: "textarea" },
          { key: "author", label: "Author", type: "text" },
        ],
      },
    ],
  },
  {
    type: "cta",
    label: "Call to action",
    description: "Bold banner with a single button.",
    defaultProps: {
      heading: "Ready to begin?",
      subheading: "Your first class is on us.",
      buttonLabel: "Book a trial",
      buttonHref: "/enrol",
    },
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "subheading", label: "Subheading", type: "text" },
      { key: "buttonLabel", label: "Button label", type: "text" },
      { key: "buttonHref", label: "Button link", type: "text" },
    ],
  },
  {
    type: "faq",
    label: "FAQ",
    appearance: true,
    description: "Common questions and answers.",
    defaultProps: {
      heading: "Frequently asked questions",
      items: [
        { question: "What should I wear?", answer: "Comfortable clothing you can move in." },
        { question: "Do you offer trials?", answer: "Yes — your first class is free." },
      ],
    },
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      {
        key: "items",
        label: "Questions",
        type: "list",
        itemDefault: { question: "New question?", answer: "Answer." },
        itemFields: [
          { key: "question", label: "Question", type: "text" },
          { key: "answer", label: "Answer", type: "textarea" },
        ],
      },
    ],
  },
  {
    type: "contact",
    label: "Contact",
    appearance: true,
    description: "Address, phone, email and hours.",
    defaultProps: {
      heading: "Visit us",
      address: "123 Studio Lane",
      phone: "",
      email: "",
      hours: "Mon–Fri 9am–8pm",
    },
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "address", label: "Address", type: "textarea" },
      { key: "phone", label: "Phone", type: "text" },
      { key: "email", label: "Email", type: "text" },
      { key: "hours", label: "Opening hours", type: "textarea" },
    ],
  },
];

export const BLOCK_MAP: Record<BlockType, BlockDef> = Object.fromEntries(
  BLOCK_LIBRARY.map((b) => [b.type, b]),
) as Record<BlockType, BlockDef>;

/** Generate a unique block id. */
function newBlockId(): string {
  return `blk_${Math.random().toString(36).slice(2, 10)}`;
}

/** Create a fresh block of the given type with its default props. */
export function makeBlock(type: BlockType): Block {
  const def = BLOCK_MAP[type];
  // Deep-clone defaults so list items aren't shared across instances.
  const props: BlockProps = structuredClone(def.defaultProps);
  // Seed appearance defaults so each block starts looking the way it always has.
  if (def.appearance) {
    const a = APPEARANCE_DEFAULTS[type] ?? { _bg: "base", _spacing: "normal" };
    if (props._bg === undefined) props._bg = a._bg;
    if (props._spacing === undefined) props._spacing = a._spacing;
  }
  return { id: newBlockId(), type, props };
}

/** Deep-clone an existing block, assigning it a fresh id (for duplicate). */
export function cloneBlock(block: Block): Block {
  return { id: newBlockId(), type: block.type, props: structuredClone(block.props) };
}

/** Type guard + normaliser for blocks loaded from the DB. */
export function normalizeBlocks(raw: unknown): Block[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (b): b is Block =>
      !!b &&
      typeof b === "object" &&
      typeof (b as Block).id === "string" &&
      typeof (b as Block).type === "string" &&
      (b as Block).type in BLOCK_MAP,
  );
}
