import { describe, it, expect } from "vitest";
import { buildSetupNavLinks, buildStudioNavLinks } from "@/lib/site/page-links";

describe("site nav links", () => {
  it("builds nav from pages flagged show in navigation", () => {
    const links = buildStudioNavLinks([
      { id: "1", title: "Home", slug: "home", isHome: true, showInNav: false, navOrder: 0 },
      { id: "2", title: "About", slug: "about", isHome: false, showInNav: true, navLabel: "About us", navOrder: 1 },
      { id: "3", title: "Classes", slug: "classes", isHome: false, showInNav: true, navOrder: 2 },
      { id: "4", title: "Hidden", slug: "hidden", isHome: false, showInNav: false, navOrder: 3 },
    ]);

    expect(links).toHaveLength(2);
    expect(links[0].label).toBe("About us");
    expect(links[1].slug).toBe("classes");
  });

  it("builds setup wizard nav from draft pages", () => {
    const links = buildSetupNavLinks([
      { title: "Home", slug: "home", isHome: true, showInNav: false },
      { title: "About", slug: "about", isHome: false, showInNav: true, navLabel: "About" },
      { title: "Contact", slug: "contact", isHome: false, showInNav: true, navLabel: "Contact" },
    ]);

    expect(links.map((l) => l.label)).toEqual(["About", "Contact"]);
  });
});
