import { describe, it, expect } from "vitest";
import { personalizeBlocks } from "@/lib/site/personalize";
import { buildSetupPages, validateSetupInput } from "@/lib/site/setup";
import { makeBlock } from "@/lib/site/blocks";

describe("personalizeBlocks", () => {
  it("replaces studio name and tagline tokens in block props", () => {
    const hero = makeBlock("hero");
    hero.props.heading = "{{studioName}}";
    hero.props.subheading = "{{tagline}}";

    const [out] = personalizeBlocks([hero], {
      studioName: "Sunrise Dance Studio",
      tagline: "Auckland · All ages",
    });

    expect(out.props.heading).toBe("Sunrise Dance Studio");
    expect(out.props.subheading).toBe("Auckland · All ages");
  });

  it("uses a default tagline when none is provided", () => {
    const hero = makeBlock("hero");
    hero.props.subheading = "{{tagline}}";

    const [out] = personalizeBlocks([hero], { studioName: "My Studio" });
    expect(out.props.subheading).toContain("World-class");
  });
});

describe("buildSetupPages", () => {
  it("creates a home page plus selected sub-pages without duplicates", () => {
    const pages = buildSetupPages({
      homeTemplateId: "home-bold",
      pageTemplateIds: ["page-about", "page-classes", "page-about"],
      studioName: "Sunrise Dance Studio",
      tagline: "Move with joy",
      fontDisplay: "Fraunces",
      fontBody: "Hanken Grotesk",
    });

    expect(pages).toHaveLength(3);
    expect(pages[0].isHome).toBe(true);
    expect(pages[0].slug).toBe("home");
    expect(pages[0].blocks[0].props.heading).toBe("Sunrise Dance Studio");

    const slugs = pages.map((p) => p.slug);
    expect(slugs).toEqual(["home", "about", "classes"]);
  });

  it("includes classic home with default blocks when no extras selected", () => {
    const pages = buildSetupPages({
      homeTemplateId: "home-classic",
      pageTemplateIds: [],
      studioName: "Test Studio",
      fontDisplay: "Archivo",
      fontBody: "Archivo",
    });

    expect(pages).toHaveLength(1);
    expect(pages[0].blocks.length).toBeGreaterThan(3);
  });
});

describe("validateSetupInput", () => {
  it("rejects missing studio name", () => {
    expect(
      validateSetupInput({
        homeTemplateId: "home-classic",
        pageTemplateIds: [],
        studioName: "",
        fontDisplay: "Fraunces",
        fontBody: "Inter",
      }),
    ).toMatch(/name/i);
  });

  it("accepts a valid setup", () => {
    expect(
      validateSetupInput({
        homeTemplateId: "home-minimal",
        pageTemplateIds: ["page-contact"],
        studioName: "Demo Studio",
        fontDisplay: "Sora",
        fontBody: "Outfit",
      }),
    ).toBeNull();
  });
});

/** Snapshot-style output for manual review — documents what setup generates. */
describe("setup generation sample", () => {
  it("produces a readable site map for Sunrise Dance Studio", () => {
    const pages = buildSetupPages({
      homeTemplateId: "home-bold",
      pageTemplateIds: ["page-about", "page-classes", "page-contact"],
      studioName: "Sunrise Dance Studio",
      tagline: "Christchurch · Ballet, jazz & contemporary",
      fontDisplay: "Fraunces",
      fontBody: "Hanken Grotesk",
    });

    const siteMap = pages.map((p) => ({
      path: p.isHome ? "/" : `/${p.slug}`,
      title: p.title,
      blocks: p.blocks.map((b) => b.type),
      heroHeading: p.blocks.find((b) => b.type === "hero")?.props.heading,
    }));

    expect(siteMap).toEqual([
      {
        path: "/",
        title: "Home",
        blocks: ["hero", "statsRow", "classStreams", "newsFeed", "cta"],
        heroHeading: "Sunrise Dance Studio",
      },
      {
        path: "/about",
        title: "About",
        blocks: ["hero", "richText", "features", "testimonials", "cta"],
        heroHeading: "Our story",
      },
      {
        path: "/classes",
        title: "Classes",
        blocks: ["hero", "classGrid", "faq", "cta"],
        heroHeading: "Find your class",
      },
      {
        path: "/contact",
        title: "Contact",
        blocks: ["hero", "contact", "faq"],
        heroHeading: "Get in touch",
      },
    ]);
  });
});
