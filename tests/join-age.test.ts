import { describe, expect, it } from "vitest";
import { isAdult } from "@/lib/join/age";

describe("isAdult", () => {
  it("returns true for 18+ birthdays", () => {
    expect(isAdult("2000-01-01", new Date("2026-06-22"))).toBe(true);
  });

  it("returns false for minors", () => {
    expect(isAdult("2015-01-01", new Date("2026-06-22"))).toBe(false);
  });

  it("returns false for invalid dates", () => {
    expect(isAdult("not-a-date")).toBe(false);
  });
});
