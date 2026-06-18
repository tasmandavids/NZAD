import { describe, it, expect } from "vitest";
import { HOME_TEMPLATES, TEMPLATE_MAP } from "@/lib/site/templates";
import { getTemplateBrandingSuggestion } from "@/lib/site/setup";
import { TYPOGRAPHY_PAIRS } from "@/lib/site/typography";

describe("site template catalog", () => {
  it("offers 20 homepage templates", () => {
    expect(HOME_TEMPLATES).toHaveLength(20);
    expect(HOME_TEMPLATES.every((t) => t.kind === "home")).toBe(true);
  });

  it("gives each home template unique ids and preview metadata", () => {
    const ids = HOME_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(20);
    for (const t of HOME_TEMPLATES) {
      expect(t.previewAccent ?? t.suggestedBrandColor).toBeTruthy();
      expect(t.blocks.length).toBeGreaterThan(2);
    }
  });

  it("suggests branding when a template is selected", () => {
    const suggestion = getTemplateBrandingSuggestion("home-spotlight");
    expect(suggestion.brandColor).toBe("#C8102E");
    expect(suggestion.base).toBe("dark");
    expect(suggestion.fontDisplay).toBeTruthy();
  });

  it("maps all templates by id", () => {
    for (const t of HOME_TEMPLATES) {
      expect(TEMPLATE_MAP[t.id]).toBeDefined();
    }
  });
});

describe("typography catalog", () => {
  it("offers 30 font pairings", () => {
    expect(TYPOGRAPHY_PAIRS).toHaveLength(30);
  });

  it("has unique typography ids", () => {
    const ids = TYPOGRAPHY_PAIRS.map((t) => t.id);
    expect(new Set(ids).size).toBe(30);
  });
});
