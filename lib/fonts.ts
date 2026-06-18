// ============================================================================
//  lib/fonts.ts — build Google Fonts stylesheet URLs from branding picks.
// ============================================================================

/** Encode a font family name for the Google Fonts CSS2 API. */
function familyParam(name: string): string {
  const encoded = name.trim().replace(/\s+/g, "+");
  return `family=${encoded}:wght@400;500;600;700`;
}

/** Stylesheet URL loading display + body fonts (deduped). */
export function googleFontsStylesheetUrl(display: string, body: string): string {
  const families = [...new Set([display, body].map((f) => f.trim()).filter(Boolean))];
  if (!families.length) return "";
  return `https://fonts.googleapis.com/css2?${families.map(familyParam).join("&")}&display=swap`;
}
