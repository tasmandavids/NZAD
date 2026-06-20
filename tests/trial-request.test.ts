import { describe, expect, it } from "vitest";
import { buildTrialLeadNotes, splitParentName } from "@/lib/enrol/trial-request";

describe("splitParentName", () => {
  it("splits first and last", () => {
    expect(splitParentName("Jane Smith")).toEqual({ firstName: "Jane", lastName: "Smith" });
  });

  it("handles single name", () => {
    expect(splitParentName("Jane")).toEqual({ firstName: "Jane", lastName: null });
  });

  it("handles multiple last-name parts", () => {
    expect(splitParentName("Jane van der Berg")).toEqual({
      firstName: "Jane",
      lastName: "van der Berg",
    });
  });

  it("returns empty first for blank", () => {
    expect(splitParentName("   ")).toEqual({ firstName: "", lastName: null });
  });
});

describe("buildTrialLeadNotes", () => {
  it("includes all provided fields", () => {
    const notes = buildTrialLeadNotes({
      childName: "Emma",
      className: "Junior Ballet",
      disciplineLabel: "Ballet",
      phone: "+64 21 000 0000",
    });
    expect(notes).toContain("Trial request from /enrol");
    expect(notes).toContain("Child: Emma");
    expect(notes).toContain("Class: Junior Ballet");
    expect(notes).toContain("Interest: Ballet");
    expect(notes).toContain("Phone: +64 21 000 0000");
  });

  it("omits empty fields", () => {
    const notes = buildTrialLeadNotes({});
    expect(notes).toBe("Trial request from /enrol");
  });
});
