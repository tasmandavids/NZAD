// ============================================================================
//  lib/builder/templates.ts — the 5 starter templates (rebuilt builder).
//
//  Each template is a complete BuilderDocument with its own theme, so picking a
//  template both lays out the page and seeds the design tokens. Kept to FIVE
//  focused starters by design.
// ============================================================================

import type { BuilderDocument, ThemeTokens } from "./schema";
import { DEFAULT_THEME } from "./tokens";
import { documentFromTree, section, heading, paragraph, button, type TreeSpec } from "./tree";

export interface StarterTemplate {
  id: string;
  name: string;
  description: string;
  accent: string;
  build: () => BuilderDocument;
}

const reveal = { trigger: "inview", preset: "fade-up", duration: 0.6, once: true } as const;

function theme(over: Partial<ThemeTokens> & { color?: Partial<ThemeTokens["color"]> }): ThemeTokens {
  return {
    ...DEFAULT_THEME,
    ...over,
    color: { ...DEFAULT_THEME.color, ...(over.color ?? {}) },
    font: { ...DEFAULT_THEME.font, ...(over.font ?? {}) },
  };
}

// ─── 1. Aurora — modern SaaS / agency ────────────────────────────────────────────
function aurora(): BuilderDocument {
  const t = theme({ base: "dark", color: { base: "#0B0B12", surface: "#15151F", ink: "#FFFFFF", body: "#B6B6C8", brand: "#8B5CF6", line: "#26263A" } });
  const featureCard = (icon: string, title: string, body: string): TreeSpec => ({
    type: "frame",
    name: title,
    animation: reveal,
    style: { layout: "flex", flexDirection: "column", gap: 12, padding: { all: 28 }, background: "{color.surface}", borderRadius: "{radius.lg}", borderWidth: 1, borderStyle: "solid", borderColor: "{color.line}" },
    children: [
      { type: "icon", props: { glyph: icon }, style: { fontSize: "{fontSize.2xl}" } },
      heading(title, { fontSize: "{fontSize.xl}", color: "{color.ink}" }, "h3"),
      paragraph(body, { fontSize: "{fontSize.base}" }),
    ],
  });
  const root = section({ padding: { top: 0, bottom: 0, left: 0, right: 0 }, gap: 0, background: "{color.base}" }, [
    section({ background: "{color.base}", padding: { top: 120, bottom: 120, left: 24, right: 24 }, gap: 28, maxWidth: "100%" }, [
      { type: "text", name: "Eyebrow", animation: reveal, props: { rich: [{ tag: "p", runs: [{ text: "✦ NOW IN PUBLIC BETA" }] }] }, style: { fontFamily: "{font.body}", color: "{color.brand}", letterSpacing: 2, fontSize: "{fontSize.sm}", fontWeight: 600 } },
      {
        type: "text",
        name: "Headline",
        animation: { ...reveal, delay: 0.05 },
        props: { rich: [{ tag: "h1", runs: [{ text: "Build anything. " }, { text: "Ship it today.", marks: { gradient: "linear-gradient(90deg,#8B5CF6,#EC4899)" } }] }], tag: "h1" },
        style: { fontFamily: "{font.display}", fontSize: "{fontSize.6xl}", fontWeight: 700, color: "{color.ink}", textAlign: "center", lineHeight: 1.05, maxWidth: 900 },
      },
      paragraph("A visual canvas for teams who move fast. Design, bind data, and publish — no handoff required.", { textAlign: "center", maxWidth: 560 }),
      {
        type: "frame", name: "Buttons", animation: { ...reveal, delay: 0.1 },
        style: { layout: "flex", flexDirection: "row", gap: 12, justifyContent: "center" },
        children: [button("Start free", "#", { background: "{color.brand}", color: "#fff" }), button("Watch demo", "#", { background: "transparent", color: "{color.ink}", borderWidth: 1, borderStyle: "solid", borderColor: "{color.line}" })],
      },
    ], "Hero"),
    section({ background: "{color.base}", padding: { top: 40, bottom: 120, left: 24, right: 24 } }, [
      {
        type: "frame", name: "Features",
        style: { layout: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, width: "100%", maxWidth: 1080 },
        responsive: { mobileP: { gridTemplateColumns: "1fr" }, tablet: { gridTemplateColumns: "1fr 1fr" } },
        children: [
          featureCard("⚡", "Fast by default", "A normalized state engine keeps the canvas buttery, even on huge pages."),
          featureCard("🎨", "Design tokens", "Change one token, re-skin everything — instantly, with no layout shift."),
          featureCard("🔗", "Bind real data", "Connect any element to a CMS collection and generate pages at scale."),
        ],
      },
    ], "Features"),
  ], "Page");
  return documentFromTree({ title: "Aurora", slug: "home", seoTitle: "Aurora — build anything" }, root, t);
}

// ─── 2. Atelier — visual / portfolio ─────────────────────────────────────────────
function atelier(): BuilderDocument {
  const t = theme({ base: "light", color: { base: "#F7F5F1", surface: "#FFFFFF", ink: "#1A1A1A", body: "#5A554E", brand: "#B45309", line: "#E7E2D8" }, font: { display: '"Fraunces", Georgia, serif' } });
  const img = (label: string): TreeSpec => ({ type: "image", name: label, style: { width: "100%", aspectRatio: "3/4", background: "{color.line}", borderRadius: "{radius.md}", objectFit: "cover" }, animation: reveal });
  const root = section({ gap: 0, padding: { all: 0 }, background: "{color.base}" }, [
    {
      type: "frame", name: "Hero", props: { as: "section" },
      style: { layout: "absolute", width: "100%", height: 560, background: "{color.ink}", overflow: "hidden" },
      children: [
        { type: "image", name: "Backdrop", style: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.55 } },
        heading("Atelier", { position: "absolute", left: 48, top: 360, color: "#fff", fontSize: "{fontSize.6xl}", fontWeight: 600 }, "h1"),
        paragraph("Photography & art direction", { position: "absolute", left: 50, top: 470, color: "#EDE9E1", fontSize: "{fontSize.xl}" }),
      ],
    },
    section({ background: "{color.base}", padding: { top: 80, bottom: 80, left: 24, right: 24 } }, [
      heading("Selected work", { fontSize: "{fontSize.3xl}", textAlign: "center" }, "h2"),
      {
        type: "frame", name: "Gallery",
        style: { layout: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, width: "100%", maxWidth: 1000 },
        responsive: { mobileP: { gridTemplateColumns: "1fr" } },
        children: [img("Plate 01"), img("Plate 02"), img("Plate 03"), img("Plate 04"), img("Plate 05"), img("Plate 06")],
      },
    ], "Work"),
  ], "Page");
  return documentFromTree({ title: "Atelier", slug: "home" }, root, t);
}

// ─── 3. Ledger — minimal editorial ───────────────────────────────────────────────
function ledger(): BuilderDocument {
  const t = theme({ base: "light", color: { base: "#FFFFFF", ink: "#111111", body: "#444444", brand: "#111111", line: "#ECECEC" }, font: { display: '"Fraunces", Georgia, serif', body: '"Inter", sans-serif' } });
  const root = section({ gap: 0, padding: { all: 0 } }, [
    section({ padding: { top: 140, bottom: 80, left: 24, right: 24 }, maxWidth: "100%" }, [
      paragraph("A NEWSLETTER ABOUT CRAFT", { color: "{color.brand}", letterSpacing: 3, fontSize: "{fontSize.sm}", fontWeight: 600, textAlign: "center" }),
      heading("Slow thoughts on building things that last.", { fontSize: "{fontSize.5xl}", textAlign: "center", maxWidth: 760, fontStyle: "italic" }, "h1"),
      paragraph("Essays every other week. No noise, no ads — just the work and the thinking behind it.", { textAlign: "center", maxWidth: 520 }),
      button("Subscribe", "#", { background: "{color.ink}", color: "#fff", alignSelf: "center" }),
    ], "Hero"),
    { type: "divider", style: { width: 80, height: 2, background: "{color.ink}", alignSelf: "center" } },
    section({ padding: { top: 60, bottom: 120, left: 24, right: 24 } }, [
      {
        type: "frame", name: "Essay",
        style: { layout: "flex", flexDirection: "column", gap: 20, maxWidth: 640, width: "100%" },
        children: [
          heading("On finishing", { fontSize: "{fontSize.2xl}" }, "h2"),
          paragraph("The hardest part of any project is not starting it — it is deciding it is done. This is a meditation on that final ten percent, and why it matters more than the first ninety.", { fontSize: "{fontSize.lg}" }),
          paragraph("Read more →", { color: "{color.brand}", fontWeight: 600 }),
        ],
      },
    ], "Body"),
  ], "Page");
  return documentFromTree({ title: "Ledger", slug: "home" }, root, t);
}

// ─── 4. Pulse — community / events / bookings ────────────────────────────────────
function pulse(): BuilderDocument {
  const t = theme({ base: "light", color: { base: "#FCFBFF", surface: "#FFFFFF", ink: "#1B1340", body: "#4B4470", brand: "#6D28D9", brandHot: "#DB2777", line: "#EAE6F7" } });
  const root = section({ gap: 0, padding: { all: 0 }, background: "{color.base}" }, [
    section({ padding: { top: 110, bottom: 80, left: 24, right: 24 }, background: "{color.base}" }, [
      heading("Move with the community.", { fontSize: "{fontSize.5xl}", textAlign: "center", fontWeight: 700, maxWidth: 820 }, "h1"),
      paragraph("Weekly classes, workshops and socials. Reserve your spot in seconds.", { textAlign: "center", maxWidth: 520 }),
      { type: "booking", name: "Class booking", animation: reveal, style: { layout: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 680 }, props: { source: "classes", limit: 4 } },
    ], "Hero"),
    section({ background: "{color.surface}", padding: { top: 80, bottom: 100, left: 24, right: 24 } }, [
      heading("What members say", { fontSize: "{fontSize.3xl}", textAlign: "center" }, "h2"),
      {
        type: "frame", name: "Quotes",
        style: { layout: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20, width: "100%", maxWidth: 880 },
        responsive: { mobileP: { gridTemplateColumns: "1fr" } },
        children: [1, 2].map((i): TreeSpec => ({
          type: "frame", name: `Quote ${i}`, animation: reveal,
          style: { layout: "flex", flexDirection: "column", gap: 12, padding: { all: 28 }, background: "{color.base}", borderRadius: "{radius.lg}" },
          children: [paragraph("“The best decision I made this year. The energy is unreal.”", { fontSize: "{fontSize.xl}", color: "{color.ink}", fontStyle: "italic" }), paragraph("— A happy member")],
        })),
      },
    ], "Social"),
  ], "Page");
  return documentFromTree({ title: "Pulse", slug: "home" }, root, t);
}

// ─── 5. Market — commerce landing ────────────────────────────────────────────────
function market(): BuilderDocument {
  const t = theme({ base: "light", color: { base: "#FFFFFF", surface: "#F6F6F8", ink: "#0F0F0F", body: "#525257", brand: "#111827", brandHot: "#F97316", line: "#E5E5EA" }, font: { display: '"Inter", sans-serif', body: '"Inter", sans-serif' } });
  const root = section({ gap: 0, padding: { all: 0 } }, [
    section({ padding: { top: 80, bottom: 60, left: 24, right: 24 }, background: "{color.surface}" }, [
      paragraph("FREE SHIPPING OVER $75", { color: "{color.brandHot}", fontWeight: 700, letterSpacing: 1, fontSize: "{fontSize.sm}", textAlign: "center" }),
      heading("The essentials, done right.", { fontSize: "{fontSize.5xl}", textAlign: "center", fontWeight: 800, maxWidth: 760 }, "h1"),
      paragraph("Thoughtfully made goods for everyday use.", { textAlign: "center", maxWidth: 480 }),
      button("Shop the collection", "#", { background: "{color.ink}", color: "#fff" }),
    ], "Hero"),
    section({ padding: { top: 72, bottom: 100, left: 24, right: 24 } }, [
      heading("New arrivals", { fontSize: "{fontSize.3xl}", alignSelf: "flex-start" }, "h2"),
      { type: "productLoop", name: "Products", animation: reveal, style: { layout: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, width: "100%", maxWidth: 1080 }, responsive: { mobileP: { gridTemplateColumns: "1fr 1fr" } }, props: { source: "products", limit: 6 } },
    ], "Grid"),
    section({ background: "{color.ink}", padding: { top: 80, bottom: 80, left: 24, right: 24 } }, [
      heading("Join the list, get 10% off.", { color: "#fff", fontSize: "{fontSize.3xl}", textAlign: "center" }, "h2"),
      button("Sign up", "#", { background: "{color.brandHot}", color: "#fff" }),
    ], "CTA"),
  ], "Page");
  return documentFromTree({ title: "Market", slug: "home" }, root, t);
}

export const STARTER_TEMPLATES: StarterTemplate[] = [
  { id: "aurora", name: "Aurora", description: "Modern SaaS / agency landing with gradient hero and feature grid.", accent: "#8B5CF6", build: aurora },
  { id: "atelier", name: "Atelier", description: "Image-led portfolio with a freeform hero and masonry-style gallery.", accent: "#B45309", build: atelier },
  { id: "ledger", name: "Ledger", description: "Minimal editorial / newsletter with elegant serif type.", accent: "#111111", build: ledger },
  { id: "pulse", name: "Pulse", description: "Community & events page with a live booking block.", accent: "#6D28D9", build: pulse },
  { id: "market", name: "Market", description: "Commerce landing with a product grid and promo CTA.", accent: "#F97316", build: market },
];

export const STARTER_TEMPLATE_MAP: Record<string, StarterTemplate> = Object.fromEntries(
  STARTER_TEMPLATES.map((t) => [t.id, t]),
);
