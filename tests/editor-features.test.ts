import { describe, it, expect } from "vitest";
import { movingRect, snapWithAlignmentGuides } from "@/lib/site/alignment-guides";
import { mergePageLinks, toPageLink } from "@/lib/site/page-links";

describe("alignment guides", () => {
  it("snaps to canvas center when close", () => {
    const moving = movingRect("a", 24, 40, 50, 160);
    const { x, guides } = snapWithAlignmentGuides(moving, [], 1000, 20);
    expect(x).toBe(25);
    expect(guides.some((g) => g.axis === "x" && g.pct === 50)).toBe(true);
  });

  it("finds guides when near another block", () => {
    const moving = movingRect("a", 12, 40, 33.333, 160);
    const other = movingRect("b", 8.333, 80, 33.333, 160);
    const { guides } = snapWithAlignmentGuides(moving, [other], 1200, 12);
    expect(guides.length).toBeGreaterThan(0);
  });
});

describe("page links", () => {
  it("builds href for home and sub-pages", () => {
    const home = toPageLink({ id: "1", title: "Home", slug: "home", is_home: true });
    const about = toPageLink({ id: "2", title: "About", slug: "about", is_home: false });
    expect(home.href).toBe("/");
    expect(about.href).toBe("/about");
  });

  it("merges app links without duplicates", () => {
    const links = mergePageLinks([toPageLink({ id: "1", title: "Home", slug: "home", is_home: true })]);
    expect(links.some((l) => l.href === "/enrol")).toBe(true);
    expect(links.filter((l) => l.href === "/").length).toBe(1);
  });
});
