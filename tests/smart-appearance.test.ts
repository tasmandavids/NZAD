import { describe, it, expect } from "vitest";
import { makeBlock } from "@/lib/site/blocks";
import { applySmartAppearance, smartAppearanceForNewBlock } from "@/lib/site/smart-appearance";

describe("smart appearance", () => {
  it("cycles section backgrounds for new blocks", () => {
    expect(smartAppearanceForNewBlock("classGrid", [])._bg).toBe("base");
    expect(smartAppearanceForNewBlock("classGrid", [makeBlock("classGrid")])._bg).toBe("surface");
    expect(
      smartAppearanceForNewBlock("classGrid", [makeBlock("classGrid"), makeBlock("richText")])._bg,
    ).toBe("tint");
  });

  it("keeps curated backgrounds for feature blocks", () => {
    expect(smartAppearanceForNewBlock("features", [])._bg).toBe("surface");
    expect(smartAppearanceForNewBlock("hero", [])._bg).toBeUndefined();
  });

  it("adds frame defaults for canvas widgets", () => {
    const image = smartAppearanceForNewBlock("imageBlock", []);
    expect(image._shadow).toBe("md");
    expect(image._radius).toBe("md");
  });

  it("merges smart defaults without clobbering explicit props", () => {
    const block = makeBlock("classGrid");
    block.props._bg = "tint";
    const next = applySmartAppearance(block, []);
    expect(next.props._bg).toBe("tint");
  });
});
