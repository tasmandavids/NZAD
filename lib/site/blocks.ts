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

import { seedLayoutProps } from "./layout";

export type BlockType =
  | "heading"
  | "paragraph"
  | "imageBlock"
  | "videoBlock"
  | "linkBlock"
  | "hero"
  | "pageHeader"
  | "statsRow"
  | "classStreams"
  | "classTabs"
  | "richText"
  | "features"
  | "classGrid"
  | "schedule"
  | "gallery"
  | "testimonials"
  | "newsFeed"
  | "peopleGrid"
  | "shopGrid"
  | "locations"
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
  | "video"
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
  /** For `textarea` fields: show the markdown-lite formatting toolbar. */
  toolbar?: boolean;
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

/** Positioning controls — available for every block in the editor. */
export const LAYOUT_FIELDS: FieldDef[] = [
  {
    key: "_x",
    label: "Horizontal position (%)",
    type: "number",
  },
  {
    key: "_y",
    label: "Vertical position (px)",
    type: "number",
  },
  {
    key: "_width",
    label: "Width (%)",
    type: "number",
  },
  {
    key: "_zIndex",
    label: "Layer (z-index)",
    type: "number",
    help: "Higher numbers appear on top.",
  },
  {
    key: "_opacity",
    label: "Opacity (%)",
    type: "number",
    help: "0 = invisible, 100 = fully visible.",
  },
];

/** Default appearance per block type (preserves the original look of each). */
export const APPEARANCE_DEFAULTS: Partial<Record<BlockType, { _bg: string; _spacing: string }>> = {
  heading: { _bg: "base", _spacing: "compact" },
  paragraph: { _bg: "base", _spacing: "compact" },
  imageBlock: { _bg: "base", _spacing: "normal" },
  videoBlock: { _bg: "base", _spacing: "normal" },
  linkBlock: { _bg: "base", _spacing: "compact" },
  pageHeader: { _bg: "base", _spacing: "compact" },
  statsRow: { _bg: "base", _spacing: "compact" },
  classStreams: { _bg: "base", _spacing: "normal" },
  classTabs: { _bg: "base", _spacing: "normal" },
  richText: { _bg: "base", _spacing: "normal" },
  features: { _bg: "surface", _spacing: "normal" },
  classGrid: { _bg: "base", _spacing: "normal" },
  schedule: { _bg: "base", _spacing: "normal" },
  gallery: { _bg: "base", _spacing: "normal" },
  testimonials: { _bg: "surface", _spacing: "normal" },
  newsFeed: { _bg: "base", _spacing: "normal" },
  peopleGrid: { _bg: "base", _spacing: "normal" },
  shopGrid: { _bg: "base", _spacing: "normal" },
  locations: { _bg: "surface", _spacing: "normal" },
  faq: { _bg: "base", _spacing: "normal" },
  contact: { _bg: "surface", _spacing: "normal" },
};

// ─── Block definitions ────────────────────────────────────────────────────────

export const BLOCK_LIBRARY: BlockDef[] = [
  {
    type: "heading",
    label: "Heading",
    appearance: true,
    description: "A standalone heading (title or sub-heading).",
    defaultProps: {
      text: "Your heading",
      level: "h2",
      align: "left",
    },
    fields: [
      { key: "text", label: "Text", type: "text" },
      {
        key: "level",
        label: "Size",
        type: "select",
        options: [
          { value: "h1", label: "Large (H1)" },
          { value: "h2", label: "Medium (H2)" },
          { value: "h3", label: "Small (H3)" },
        ],
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
    type: "paragraph",
    label: "Text",
    appearance: true,
    description: "A paragraph of body text.",
    defaultProps: {
      body: "Add your text here. Use **bold** and [links](https://example.com) if you like.",
      align: "left",
    },
    fields: [
      {
        key: "body",
        label: "Text",
        type: "textarea",
        toolbar: true,
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
    type: "imageBlock",
    label: "Image",
    appearance: true,
    description: "A single image with optional caption and link.",
    defaultProps: {
      imageUrl: "",
      alt: "",
      caption: "",
      linkHref: "",
    },
    fields: [
      { key: "imageUrl", label: "Image", type: "image" },
      { key: "alt", label: "Alt text", type: "text" },
      { key: "caption", label: "Caption", type: "text" },
      { key: "linkHref", label: "Link URL (optional)", type: "text", help: "Clicking the image opens this link." },
    ],
  },
  {
    type: "videoBlock",
    label: "Video",
    appearance: true,
    description: "Upload a video with optional autoplay, loop, and poster image.",
    defaultProps: {
      videoUrl: "",
      posterUrl: "",
      autoplay: false,
      loop: false,
      muted: true,
      controls: true,
    },
    fields: [
      { key: "videoUrl", label: "Video", type: "video" },
      { key: "posterUrl", label: "Poster image (optional)", type: "image" },
      { key: "autoplay", label: "Autoplay", type: "boolean", help: "Browsers require muted autoplay." },
      { key: "loop", label: "Loop", type: "boolean" },
      { key: "muted", label: "Muted", type: "boolean" },
      { key: "controls", label: "Show playback controls", type: "boolean" },
    ],
  },
  {
    type: "linkBlock",
    label: "Link",
    appearance: true,
    description: "A text link or button linking to a page or URL.",
    defaultProps: {
      label: "Learn more",
      href: "/",
      variant: "button",
      align: "left",
    },
    fields: [
      { key: "label", label: "Label", type: "text" },
      { key: "href", label: "Link", type: "text" },
      {
        key: "variant",
        label: "Style",
        type: "select",
        options: [
          { value: "button", label: "Button" },
          { value: "text", label: "Text link" },
        ],
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
      variant: "academy",
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
      {
        key: "align",
        label: "Alignment",
        type: "select",
        options: [
          { value: "center", label: "Center" },
          { value: "left", label: "Left" },
        ],
      },
      {
        key: "variant",
        label: "Style",
        type: "select",
        options: [
          { value: "academy", label: "Academy (full-bleed dark)" },
          { value: "default", label: "Default gradient" },
        ],
      },
    ],
  },
  {
    type: "pageHeader",
    label: "Page header",
    appearance: true,
    description: "Inner-page hero with eyebrow, title and subtitle.",
    defaultProps: {
      eyebrow: "Our story",
      heading: "About us",
      subheading: "Who we are and why we do what we do.",
      align: "center",
    },
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "heading", label: "Heading", type: "text" },
      { key: "subheading", label: "Subheading", type: "textarea" },
      {
        key: "align",
        label: "Alignment",
        type: "select",
        options: [
          { value: "center", label: "Center" },
          { value: "left", label: "Left" },
        ],
      },
    ],
  },
  {
    type: "statsRow",
    label: "Stats row",
    appearance: true,
    description: "Horizontal strip of badge stats (syllabi, age ranges, etc.).",
    defaultProps: {
      items: [
        { label: "R.A.D. · B.B.O. · NZAMD", sublabel: "Certified syllabi" },
        { label: "World-class", sublabel: "Training" },
        { label: "All ages welcome", sublabel: "3 yrs to adult" },
        { label: "Exceptional", sublabel: "Faculty" },
      ],
    },
    fields: [
      {
        key: "items",
        label: "Stats",
        type: "list",
        itemDefault: { label: "Label", sublabel: "Sublabel" },
        itemFields: [
          { key: "label", label: "Label", type: "text" },
          { key: "sublabel", label: "Sublabel", type: "text" },
        ],
      },
    ],
  },
  {
    type: "classStreams",
    label: "Class streams",
    appearance: true,
    description: "Age/category cards linking to class pages.",
    defaultProps: {
      heading: "Our classes",
      eyebrow: "What we offer",
      items: [
        { title: "Beginners", subtitle: "3–5 yrs", href: "/classes" },
        { title: "Juniors", subtitle: "5–12 yrs", href: "/classes" },
        { title: "Seniors", subtitle: "12+ yrs", href: "/classes" },
        { title: "Adults", subtitle: "All ages", href: "/classes" },
        { title: "Companies", subtitle: "Audition", href: "/classes" },
        { title: "Senior Swans", subtitle: "55+", href: "/classes" },
      ],
      viewAllLabel: "View all classes",
      viewAllHref: "/classes",
    },
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "heading", label: "Heading", type: "text" },
      {
        key: "items",
        label: "Streams",
        type: "list",
        itemDefault: { title: "Stream", subtitle: "Age range", href: "/classes", imageUrl: "" },
        itemFields: [
          { key: "title", label: "Title", type: "text" },
          { key: "subtitle", label: "Subtitle", type: "text" },
          { key: "href", label: "Link", type: "text" },
          { key: "imageUrl", label: "Image URL", type: "image" },
        ],
      },
      { key: "viewAllLabel", label: "View-all button label", type: "text" },
      { key: "viewAllHref", label: "View-all link", type: "text" },
    ],
  },
  {
    type: "classTabs",
    label: "Class tabs",
    appearance: true,
    description: "Tabbed class streams with detail panel (live class data).",
    defaultProps: {
      eyebrow: "Streams 2026",
      heading: "Our classes",
      subheading: "From tiny first steps to elite performance training.",
      limit: 50,
    },
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "heading", label: "Heading", type: "text" },
      { key: "subheading", label: "Subheading", type: "textarea" },
      { key: "limit", label: "Max classes to load", type: "number" },
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
        toolbar: true,
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
    type: "schedule",
    label: "Schedule",
    appearance: true,
    description: "Weekly timetable with day and studio filters (live class data).",
    defaultProps: {
      eyebrow: "Timetable",
      heading: "Term timetable",
      subheading: "All times are local.",
      footnote: "Updated weekly · All times are local",
    },
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "heading", label: "Heading", type: "text" },
      { key: "subheading", label: "Subheading", type: "text" },
      { key: "footnote", label: "Footnote", type: "text" },
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
    type: "newsFeed",
    label: "News & events",
    appearance: true,
    description: "Filterable feed of published studio events.",
    defaultProps: {
      eyebrow: "Stay informed",
      heading: "News & events",
      subheading: "Term dates, productions, and announcements.",
      limit: 6,
      showFilters: true,
      viewAllLabel: "All news",
      viewAllHref: "/news",
    },
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "heading", label: "Heading", type: "text" },
      { key: "subheading", label: "Subheading", type: "textarea" },
      { key: "limit", label: "Max items", type: "number" },
      { key: "showFilters", label: "Show category filters", type: "boolean" },
      { key: "viewAllLabel", label: "View-all label", type: "text" },
      { key: "viewAllHref", label: "View-all link", type: "text" },
    ],
  },
  {
    type: "peopleGrid",
    label: "People / instructors",
    appearance: true,
    description: "Grid of studio staff (managed in admin or editor list).",
    defaultProps: {
      eyebrow: "Our team",
      heading: "Meet our instructors",
      subheading: "Experienced professionals dedicated to nurturing the next generation.",
      source: "staff",
      limit: 24,
      items: [],
    },
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "heading", label: "Heading", type: "text" },
      { key: "subheading", label: "Subheading", type: "textarea" },
      {
        key: "source",
        label: "Data source",
        type: "select",
        options: [
          { value: "staff", label: "Staff table (admin-managed)" },
          { value: "manual", label: "Manual list below" },
        ],
      },
      { key: "limit", label: "Max people (staff source)", type: "number" },
      {
        key: "items",
        label: "People (manual source)",
        type: "list",
        itemDefault: { name: "Name", role: "Role", bio: "", photoUrl: "" },
        itemFields: [
          { key: "name", label: "Name", type: "text" },
          { key: "role", label: "Role", type: "text" },
          { key: "bio", label: "Bio", type: "textarea" },
          { key: "photoUrl", label: "Photo URL", type: "image" },
        ],
      },
    ],
  },
  {
    type: "shopGrid",
    label: "Shop",
    appearance: true,
    description: "Product catalogue with category filters (live shop data).",
    defaultProps: {
      eyebrow: "Store",
      heading: "Shop",
      subheading: "Uniforms, merchandise, and tickets.",
      limit: 24,
      showFilters: true,
      footnote: "Secure payments powered by Stripe.",
    },
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "heading", label: "Heading", type: "text" },
      { key: "subheading", label: "Subheading", type: "textarea" },
      { key: "limit", label: "Max products", type: "number" },
      { key: "showFilters", label: "Show category filters", type: "boolean" },
      { key: "footnote", label: "Footnote", type: "text" },
    ],
  },
  {
    type: "locations",
    label: "Locations",
    appearance: true,
    description: "Multi-studio location cards.",
    defaultProps: {
      heading: "Our studios",
      items: [
        { name: "Main studio", detail: "Studios 1, 2, 3 + theatre", address: "" },
        { name: "Annex", detail: "Studio 4", address: "" },
      ],
    },
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      {
        key: "items",
        label: "Locations",
        type: "list",
        itemDefault: { name: "Location", detail: "Details", address: "" },
        itemFields: [
          { key: "name", label: "Name", type: "text" },
          { key: "detail", label: "Detail", type: "text" },
          { key: "address", label: "Address", type: "textarea" },
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
  const props: BlockProps = seedLayoutProps(structuredClone(def.defaultProps));
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
