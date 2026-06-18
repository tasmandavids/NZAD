// ============================================================================
//  lib/site/typography.ts — curated font pairings for the site builder.
//  Each pair uses Google Fonts (loaded via lib/fonts.ts). Safe for client + server.
// ============================================================================

export type TypographyCategory =
  | "elegant"
  | "modern"
  | "classic"
  | "bold"
  | "friendly"
  | "minimal"
  | "creative"
  | "editorial";

export type TypographyPair = {
  id: string;
  label: string;
  description: string;
  display: string;
  body: string;
  category: TypographyCategory;
};

export const TYPOGRAPHY_CATEGORIES: { id: TypographyCategory | "all"; label: string }[] = [
  { id: "all", label: "All styles" },
  { id: "elegant", label: "Elegant" },
  { id: "modern", label: "Modern" },
  { id: "classic", label: "Classic" },
  { id: "bold", label: "Bold" },
  { id: "friendly", label: "Friendly" },
  { id: "minimal", label: "Minimal" },
  { id: "creative", label: "Creative" },
  { id: "editorial", label: "Editorial" },
];

export const TYPOGRAPHY_PAIRS: TypographyPair[] = [
  { id: "fraunces-hanken", label: "Iris & Ink", description: "Warm serif headlines with crisp sans body.", display: "Fraunces", body: "Hanken Grotesk", category: "elegant" },
  { id: "cormorant-inter", label: "Editorial Classic", description: "High-fashion editorial pairing.", display: "Cormorant Garamond", body: "Inter", category: "editorial" },
  { id: "playfair-source", label: "Gallery White", description: "Refined contrast for image-led sites.", display: "Playfair Display", body: "Source Sans 3", category: "elegant" },
  { id: "libre-lato", label: "Heritage", description: "Trustworthy and readable.", display: "Libre Baskerville", body: "Lato", category: "classic" },
  { id: "merriweather-opensans", label: "Scholar", description: "Academic clarity with warmth.", display: "Merriweather", body: "Open Sans", category: "classic" },
  { id: "lora-nunito", label: "Soft Serif", description: "Approachable and gentle.", display: "Lora", body: "Nunito Sans", category: "friendly" },
  { id: "dm-serif-dm-sans", label: "DM Duo", description: "Geometric harmony from one family.", display: "DM Serif Display", body: "DM Sans", category: "modern" },
  { id: "cinzel-raleway", label: "Grand Stage", description: "Dramatic display for performance arts.", display: "Cinzel", body: "Raleway", category: "bold" },
  { id: "bodoni-work", label: "Atelier", description: "Luxury fashion-house feel.", display: "Bodoni Moda", body: "Work Sans", category: "elegant" },
  { id: "oswald-roboto", label: "Impact", description: "Strong headlines, neutral body.", display: "Oswald", body: "Roboto", category: "bold" },
  { id: "bebas-montserrat", label: "Poster Bold", description: "All-caps energy with clean copy.", display: "Bebas Neue", body: "Montserrat", category: "bold" },
  { id: "space-inter", label: "Tech Studio", description: "Contemporary startup aesthetic.", display: "Space Grotesk", body: "Inter", category: "modern" },
  { id: "archivo", label: "Mono Modern", description: "Single-family geometric clarity.", display: "Archivo", body: "Archivo", category: "minimal" },
  { id: "poppins", label: "Rounded Pop", description: "Friendly and universally readable.", display: "Poppins", body: "Poppins", category: "friendly" },
  { id: "nunito", label: "Bubble Warm", description: "Soft curves for family brands.", display: "Nunito", body: "Nunito", category: "friendly" },
  { id: "lexend", label: "Readable First", description: "Optimised for effortless scanning.", display: "Lexend", body: "Lexend", category: "minimal" },
  { id: "rubik", label: "Rounded Edge", description: "Playful geometry without noise.", display: "Rubik", body: "Rubik", category: "friendly" },
  { id: "manrope", label: "Neutral Pro", description: "Balanced and professional.", display: "Manrope", body: "Manrope", category: "modern" },
  { id: "jakarta", label: "Startup Clean", description: "Fresh SaaS landing-page energy.", display: "Plus Jakarta Sans", body: "Plus Jakarta Sans", category: "modern" },
  { id: "eb-karla", label: "Bookshop", description: "Literary warmth with modern body.", display: "EB Garamond", body: "Karla", category: "editorial" },
  { id: "crimson-franklin", label: "Broadsheet", description: "Newspaper heritage meets web.", display: "Crimson Pro", body: "Libre Franklin", category: "editorial" },
  { id: "josefin-lato", label: "Art Deco", description: "Vintage glamour with clarity.", display: "Josefin Sans", body: "Lato", category: "creative" },
  { id: "albert", label: "Swiss Lite", description: "Ultra-clean single family.", display: "Albert Sans", body: "Albert Sans", category: "minimal" },
  { id: "quicksand", label: "Playground", description: "Light and welcoming for kids.", display: "Quicksand", body: "Quicksand", category: "friendly" },
  { id: "figtree", label: "Fig & Flow", description: "Contemporary humanist sans.", display: "Figtree", body: "Figtree", category: "modern" },
  { id: "urbanist", label: "Urban Grid", description: "City-studio modernism.", display: "Urbanist", body: "Urbanist", category: "modern" },
  { id: "instrument", label: "Instrument", description: "Distinctive editorial character.", display: "Instrument Serif", body: "Instrument Sans", category: "creative" },
  { id: "bricolage", label: "Bricolage", description: "Expressive variable sans.", display: "Bricolage Grotesque", body: "Bricolage Grotesque", category: "creative" },
  { id: "syne-inter", label: "Syne Pulse", description: "Experimental display with calm body.", display: "Syne", body: "Inter", category: "creative" },
  { id: "sora-outfit", label: "Sora & Outfit", description: "Clean, friendly, and approachable.", display: "Sora", body: "Outfit", category: "friendly" },
];

/** @deprecated Use TYPOGRAPHY_PAIRS — kept for backwards compatibility. */
export const FONT_PAIRS = TYPOGRAPHY_PAIRS;

export const TYPOGRAPHY_MAP: Record<string, TypographyPair> = Object.fromEntries(
  TYPOGRAPHY_PAIRS.map((t) => [t.id, t]),
);

export function getTypographyPair(id: string): TypographyPair {
  return TYPOGRAPHY_MAP[id] ?? TYPOGRAPHY_PAIRS[0];
}

export function filterTypography(category: TypographyCategory | "all"): TypographyPair[] {
  if (category === "all") return TYPOGRAPHY_PAIRS;
  return TYPOGRAPHY_PAIRS.filter((t) => t.category === category);
}

/** All unique Google Font family names used in the catalog. */
export function allFontFamilies(): string[] {
  const names = new Set<string>();
  for (const t of TYPOGRAPHY_PAIRS) {
    names.add(t.display);
    names.add(t.body);
  }
  return [...names];
}
