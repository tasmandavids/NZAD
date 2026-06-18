import { describe, it, expect } from "vitest";
import { buttonStyleClasses, ctaButtonClasses } from "@/lib/site/button-styles";
import {
  frameClassExtras,
  snapRotation,
  textColorClass,
  typographyClasses,
  canvasAlignX,
} from "@/lib/site/block-styles";

describe("button styles", () => {
  it("returns distinct classes per style", () => {
    const solid = buttonStyleClasses("solid");
    const outline = buttonStyleClasses("outline");
    expect(solid).toContain("bg-brand");
    expect(outline).toContain("border-brand");
    expect(solid).not.toBe(outline);
  });

  it("returns CTA button variants for dark backgrounds", () => {
    expect(ctaButtonClasses("white")).toContain("bg-white");
    expect(ctaButtonClasses("outline-white")).toContain("border-white");
  });

  it("supports size variants", () => {
    expect(buttonStyleClasses("solid", "lg")).toContain("text-base");
    expect(buttonStyleClasses("solid", "sm")).toContain("text-xs");
  });
});

describe("block frame & typography styles", () => {
  it("snaps rotation to 15 degree steps", () => {
    expect(snapRotation(7)).toBe(0);
    expect(snapRotation(23)).toBe(30);
  });

  it("applies frame decoration classes", () => {
    expect(frameClassExtras({ _shadow: "lg", _radius: "md", _border: "brand" })).toContain("shadow-lg");
  });

  it("applies typography presets", () => {
    expect(textColorClass({ textColor: "brand" })).toBe("text-brand");
    expect(typographyClasses({ fontSize: "2xl", fontWeight: "bold" })).toContain("text-2xl");
  });

  it("computes canvas alignment", () => {
    expect(canvasAlignX(50, "center")).toBe(25);
  });
});
