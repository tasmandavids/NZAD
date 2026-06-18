import { describe, it, expect } from "vitest";
import { buildTemplateBlocks } from "@/lib/site/templates";
import { makeBlock } from "@/lib/site/blocks";
import {
  CANVAS_GRID,
  isCanvasWidget,
  isDefaultCanvasFrame,
  looksLikeUnpositionedFreeform,
  seedLayoutDefaults,
  seedLayoutProps,
  snapGridWidth,
  snapGridX,
  snapGridY,
  snapLayoutPatch,
  usesCanvasLayout,
  usesStackLayout,
} from "@/lib/site/layout";

describe("site layout", () => {
  it("keeps template blocks in stack mode for vertical previews", () => {
    const blocks = buildTemplateBlocks([
      { type: "hero" },
      { type: "features" },
      { type: "cta" },
    ]);

    expect(usesStackLayout(blocks)).toBe(true);
    expect(blocks.every((b) => b.props._position === "stack")).toBe(true);
  });

  it("migrates stacked canvas widgets to freeform positions in the editor", () => {
    const heading = makeBlock("heading");
    const paragraph = makeBlock("paragraph");

    const migrated = [heading, paragraph].map((b, i) => ({
      ...b,
      props: seedLayoutProps(b.props, i),
    }));

    expect(usesStackLayout(migrated)).toBe(false);
    expect(migrated[0].props._position).toBe("freeform");
    expect(migrated[0].props._width).toBe(snapGridWidth(90));
    expect(migrated[0].props._x).toBe(snapGridX(5));
  });

  it("keeps section blocks in stack mode", () => {
    const hero = makeBlock("hero");
    const props = seedLayoutDefaults(hero.props, 0);
    props._position = "stack";
    expect(props._position).toBe("stack");
    expect(isCanvasWidget("hero")).toBe(false);
    expect(isCanvasWidget("heading")).toBe(true);
  });

  it("treats default freeform frames as unpositioned for public stack fallback", () => {
    const blocks = buildTemplateBlocks([{ type: "hero" }, { type: "features" }]).map((b, i) => ({
      ...b,
      props: { ...b.props, _position: "freeform" as const },
    }));

    expect(looksLikeUnpositionedFreeform(blocks)).toBe(true);
    expect(usesCanvasLayout(blocks)).toBe(false);
    expect(isDefaultCanvasFrame(blocks[0].props)).toBe(true);
  });

  it("uses canvas layout when blocks were placed on the grid", () => {
    const block = makeBlock("heading");
    block.props._position = "freeform";
    block.props._x = snapGridX(25);
    block.props._width = snapGridWidth(50);

    expect(usesCanvasLayout([block])).toBe(true);
  });

  it("seeds defaults without forcing canvas migration for new blocks", () => {
    const props = seedLayoutDefaults({});
    expect(props._position).toBe("stack");
    expect(props._y).toBe(0);
  });

  it("snaps positions and sizes to the 12-column grid", () => {
    expect(snapGridX(7)).toBe(8.333);
    expect(snapGridY(55)).toBe(40);
    expect(snapGridWidth(55)).toBe(58.333);
    expect(snapLayoutPatch({ _x: 7, _y: 55, _width: 55, _height: 100 })).toEqual({
      _x: 8.333,
      _y: 40,
      _width: 58.333,
      _height: 120,
    });
  });

  it("uses row multiples for canvas migration spacing", () => {
    const row = CANVAS_GRID.rowHeight * 4;
    const migrated = seedLayoutProps({}, 2);
    expect(migrated._y).toBe(snapGridY(row * 2));
  });
});
