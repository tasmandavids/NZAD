// ============================================================================
//  lib/site/templates.ts — ready-made page templates for the site builder.
//
//  A template is a named recipe: page meta (title/slug/nav/SEO) + an ordered
//  list of blocks with tailored copy. `buildTemplateBlocks` turns the recipe
//  into real `Block` objects (via `makeBlock`, so each block also gets its
//  sensible defaults + appearance props), applying per-block prop overrides.
//
//  Two kinds:
//    • "home"  — full homepage layouts (themes). Only offered when the studio
//                has no homepage yet (one home per studio).
//    • "page"  — sub-page starters (About, Classes, Contact).
//
//  Pure data + helpers; no server-only imports, so it's safe to import from
//  both the server actions and client components.
// ============================================================================

import { makeBlock, type Block, type BlockProps, type BlockType } from "./blocks";

/** A block within a template: its type plus optional prop overrides. */
export type TemplateBlock = {
  type: BlockType;
  /** Shallow-merged over the block type's default props. */
  props?: Partial<BlockProps>;
};

export type PageTemplate = {
  id: string;
  label: string;
  description: string;
  kind: "home" | "page";
  /** Default page title. */
  title: string;
  /** Default slug (sub-pages only; home always becomes "home"). */
  slug?: string;
  isHome?: boolean;
  showInNav?: boolean;
  navLabel?: string;
  seoTitle?: string;
  seoDescription?: string;
  blocks: TemplateBlock[];
};

/** Turn a template's block recipe into concrete Block objects. */
export function buildTemplateBlocks(blocks: TemplateBlock[]): Block[] {
  return blocks.map(({ type, props }) => {
    const block = makeBlock(type);
    if (props) {
      for (const [key, val] of Object.entries(props)) {
        if (val !== undefined) block.props[key] = val;
      }
    }
    return block;
  });
}

// ─── Home themes ────────────────────────────────────────────────────────────

const HOME_CLASSIC: PageTemplate = {
  id: "home-classic",
  label: "Classic",
  description: "Hero, feature grid, class showcase, testimonials, call-to-action and contact.",
  kind: "home",
  title: "Home",
  isHome: true,
  showInNav: false,
  blocks: [
    { type: "hero" },
    { type: "features" },
    { type: "classGrid" },
    { type: "testimonials" },
    { type: "cta" },
    { type: "contact" },
  ],
};

const HOME_SHOWCASE: PageTemplate = {
  id: "home-showcase",
  label: "Showcase",
  description: "Image-led layout: bold hero, class showcase, gallery and testimonials.",
  kind: "home",
  title: "Home",
  isHome: true,
  showInNav: false,
  blocks: [
    {
      type: "hero",
      props: {
        eyebrow: "Welcome",
        heading: "Where movement becomes mastery.",
        subheading: "Step inside a studio built for serious progress and real joy.",
        align: "center",
      },
    },
    { type: "classGrid", props: { heading: "Explore the studio", _bg: "base" } },
    { type: "gallery", props: { heading: "Inside the studio", _bg: "surface" } },
    { type: "testimonials", props: { _bg: "tint" } },
    { type: "cta" },
    { type: "contact" },
  ],
};

const HOME_MINIMAL: PageTemplate = {
  id: "home-minimal",
  label: "Minimal",
  description: "A clean, focused single-message homepage: hero, intro, classes and a CTA.",
  kind: "home",
  title: "Home",
  isHome: true,
  showInNav: false,
  blocks: [
    {
      type: "hero",
      props: {
        eyebrow: "",
        heading: "Train with intention.",
        subheading: "Small classes. Expert instruction. Real results.",
        secondaryLabel: "",
        secondaryHref: "",
      },
    },
    {
      type: "richText",
      props: {
        heading: "Our approach",
        body:
          "We keep classes small and focused so every student gets real attention.\n\n" +
          "Whether you're taking your **first class** or refining advanced technique, " +
          "you'll train in a space designed around your progress.",
        align: "center",
        _spacing: "spacious",
      },
    },
    { type: "classGrid" },
    { type: "cta" },
  ],
};

const HOME_BOLD: PageTemplate = {
  id: "home-bold",
  label: "Bold",
  description: "Full-bleed hero, stats strip, class streams, news preview and enrol CTA.",
  kind: "home",
  title: "Home",
  isHome: true,
  showInNav: false,
  blocks: [
    {
      type: "hero",
      props: {
        eyebrow: "Welcome",
        heading: "{{studioName}}",
        subheading: "{{tagline}}",
        primaryLabel: "Explore classes",
        primaryHref: "/classes",
        secondaryLabel: "Book a trial",
        secondaryHref: "/enrol",
        variant: "academy",
        align: "center",
      },
    },
    {
      type: "statsRow",
      props: {
        items: [
          { label: "Expert", sublabel: "Instructors" },
          { label: "All levels", sublabel: "Welcome" },
          { label: "Small classes", sublabel: "Personal attention" },
          { label: "Community", sublabel: "Built to last" },
        ],
      },
    },
    {
      type: "classStreams",
      props: {
        eyebrow: "What we offer",
        heading: "Our classes",
        viewAllLabel: "View all classes",
        viewAllHref: "/classes",
      },
    },
    {
      type: "newsFeed",
      props: {
        eyebrow: "Stay informed",
        heading: "News & events",
        limit: 3,
        showFilters: false,
        viewAllLabel: "All news",
        viewAllHref: "/news",
      },
    },
    {
      type: "cta",
      props: {
        heading: "Ready to begin?",
        subheading: "Book a trial class and find your fit.",
        buttonLabel: "Enrol now",
        buttonHref: "/enrol",
      },
    },
  ],
};

// ─── Sub-page templates ───────────────────────────────────────────────────────

const PAGE_SCHEDULE: PageTemplate = {
  id: "page-schedule",
  label: "Schedule",
  description: "Weekly timetable with day and studio filters.",
  kind: "page",
  title: "Schedule",
  slug: "schedule",
  showInNav: true,
  navLabel: "Schedule",
  blocks: [
    {
      type: "schedule",
      props: {
        eyebrow: "Timetable",
        heading: "Term timetable",
        subheading: "Browse classes by day and studio.",
        footnote: "All times are local.",
      },
    },
  ],
};

const PAGE_PEOPLE: PageTemplate = {
  id: "page-people",
  label: "People",
  description: "Instructor grid from staff profiles.",
  kind: "page",
  title: "People",
  slug: "people",
  showInNav: true,
  navLabel: "People",
  blocks: [
    {
      type: "peopleGrid",
      props: {
        eyebrow: "Our team",
        heading: "Meet our instructors",
        subheading: "Experienced professionals dedicated to nurturing the next generation.",
        source: "staff",
        limit: 24,
      },
    },
  ],
};

const PAGE_STUDIOS: PageTemplate = {
  id: "page-studios",
  label: "Studios",
  description: "Multi-location studio cards and contact.",
  kind: "page",
  title: "Studios",
  slug: "studios",
  showInNav: true,
  navLabel: "Studios",
  blocks: [
    {
      type: "pageHeader",
      props: { eyebrow: "Locations", heading: "Our studios", subheading: "Find us across the city." },
    },
    {
      type: "locations",
      props: {
        heading: "Studio locations",
        items: [
          { name: "Main studio", detail: "Studios 1, 2, 3 + theatre", address: "" },
          { name: "Annex", detail: "Studio 4", address: "" },
        ],
      },
    },
    { type: "contact" },
  ],
};

const PAGE_NEWS: PageTemplate = {
  id: "page-news",
  label: "News & Events",
  description: "Filterable news and events feed.",
  kind: "page",
  title: "News",
  slug: "news",
  showInNav: true,
  navLabel: "News & Events",
  blocks: [
    {
      type: "newsFeed",
      props: {
        eyebrow: "Stay connected",
        heading: "News & events",
        subheading: "Term dates, productions, exam results, and announcements.",
        limit: 12,
        showFilters: true,
      },
    },
  ],
};

const PAGE_SHOP: PageTemplate = {
  id: "page-shop",
  label: "Shop",
  description: "Product catalogue with category filters and checkout.",
  kind: "page",
  title: "Shop",
  slug: "shop",
  showInNav: true,
  navLabel: "Shop",
  blocks: [
    {
      type: "shopGrid",
      props: {
        eyebrow: "Store",
        heading: "Shop",
        subheading: "Uniforms, merchandise, and tickets.",
        limit: 24,
        showFilters: true,
        footnote: "Secure payments powered by Stripe.",
      },
    },
  ],
};

const PAGE_ABOUT: PageTemplate = {
  id: "page-about",
  label: "About",
  description: "Tell your story: intro hero, narrative text, values and a closing CTA.",
  kind: "page",
  title: "About",
  slug: "about",
  showInNav: true,
  navLabel: "About",
  seoTitle: "About us",
  seoDescription: "Learn about our studio, our instructors and what makes us different.",
  blocks: [
    {
      type: "hero",
      props: {
        eyebrow: "About",
        heading: "Our story",
        subheading: "Who we are and why we do what we do.",
        primaryLabel: "Book a trial",
        primaryHref: "/enrol",
        secondaryLabel: "",
        secondaryHref: "",
        align: "center",
      },
    },
    {
      type: "richText",
      props: {
        heading: "Where it all began",
        body:
          "Share how your studio started, what you believe in, and the experience you want every student to have.\n\n" +
          "Use a blank line for a new paragraph, `- ` for bullet points, **bold** for emphasis, and [links](https://example.com) where helpful.",
        align: "left",
      },
    },
    { type: "features", props: { heading: "What we stand for" } },
    { type: "testimonials" },
    { type: "cta" },
  ],
};

const PAGE_CLASSES: PageTemplate = {
  id: "page-classes",
  label: "Classes",
  description: "A dedicated class listing page with FAQ and a sign-up CTA.",
  kind: "page",
  title: "Classes",
  slug: "classes",
  showInNav: true,
  navLabel: "Classes",
  seoTitle: "Classes & programmes",
  seoDescription: "Browse our full range of classes and find the right fit for you.",
  blocks: [
    {
      type: "hero",
      props: {
        eyebrow: "Programmes",
        heading: "Find your class",
        subheading: "Every level, every age — there's a place for you here.",
        primaryLabel: "Book a trial",
        primaryHref: "/enrol",
        secondaryLabel: "",
        secondaryHref: "",
        align: "center",
      },
    },
    { type: "classGrid", props: { heading: "All classes", subheading: "", limit: 24 } },
    { type: "faq" },
    { type: "cta" },
  ],
};

const PAGE_CONTACT: PageTemplate = {
  id: "page-contact",
  label: "Contact",
  description: "Contact details and opening hours, plus a short FAQ.",
  kind: "page",
  title: "Contact",
  slug: "contact",
  showInNav: true,
  navLabel: "Contact",
  seoTitle: "Contact us",
  seoDescription: "Get in touch — find our address, phone, email and opening hours.",
  blocks: [
    {
      type: "hero",
      props: {
        eyebrow: "Contact",
        heading: "Get in touch",
        subheading: "We'd love to hear from you.",
        primaryLabel: "Book a trial",
        primaryHref: "/enrol",
        secondaryLabel: "",
        secondaryHref: "",
        align: "center",
      },
    },
    { type: "contact" },
    { type: "faq", props: { heading: "Before you visit" } },
  ],
};

export const SITE_TEMPLATES: PageTemplate[] = [
  HOME_CLASSIC,
  HOME_SHOWCASE,
  HOME_MINIMAL,
  HOME_BOLD,
  PAGE_ABOUT,
  PAGE_CLASSES,
  PAGE_SCHEDULE,
  PAGE_PEOPLE,
  PAGE_STUDIOS,
  PAGE_NEWS,
  PAGE_SHOP,
  PAGE_CONTACT,
];

export const TEMPLATE_MAP: Record<string, PageTemplate> = Object.fromEntries(
  SITE_TEMPLATES.map((t) => [t.id, t]),
);

export const HOME_TEMPLATES = SITE_TEMPLATES.filter((t) => t.kind === "home");
export const PAGE_TEMPLATES = SITE_TEMPLATES.filter((t) => t.kind === "page");
