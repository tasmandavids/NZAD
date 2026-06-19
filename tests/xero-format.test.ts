import { describe, expect, it } from "vitest";
import { formatMonthKey, formatShortDate, formatSyncTime } from "@/lib/xero/format";

describe("xero format helpers", () => {
  it("formats sync time in NZ timezone without am/pm", () => {
    const formatted = formatSyncTime("2026-06-19T01:52:08.000Z");
    expect(formatted).not.toMatch(/am|pm/i);
    expect(formatted).toContain("2026");
    expect(formatted).toContain("52");
  });

  it("formats month keys deterministically", () => {
    expect(formatMonthKey("2026-06")).toBe("Jun");
  });

  it("formats short dates from ISO date strings", () => {
    expect(formatShortDate("2026-06-03")).toBe("3 Jun 26");
  });
});
