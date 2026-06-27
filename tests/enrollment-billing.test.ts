import { describe, it, expect } from "vitest";
import {
  normalizeClassName,
  studentHasActiveEnrollmentForClassName,
  enrollmentBillableCents,
} from "@/lib/enrollment-billing";
import { makeSupabaseMock } from "./helpers/supabaseMock";

const enrollments = (rows: { id: string; classes: { id: string; name: string } }[]) => ({
  list: { data: rows },
});

describe("normalizeClassName", () => {
  it("trims and lowercases", () => {
    expect(normalizeClassName("  Advanced 2  ")).toBe("advanced 2");
  });

  it("collapses internal whitespace", () => {
    expect(normalizeClassName("Advanced   2")).toBe("advanced 2");
  });
});

describe("studentHasActiveEnrollmentForClassName", () => {
  it("returns false with no enrollments", async () => {
    const supabase = makeSupabaseMock({ enrollments: enrollments([]) });
    const r = await studentHasActiveEnrollmentForClassName(supabase, "s1", "Advanced 2");
    expect(r).toBe(false);
  });

  it("returns true when another day of the same programme is active", async () => {
    const supabase = makeSupabaseMock({
      enrollments: enrollments([
        { id: "e1", classes: { id: "c-mon", name: "Advanced 2" } },
      ]),
    });
    const r = await studentHasActiveEnrollmentForClassName(
      supabase,
      "s1",
      "Advanced 2",
    );
    expect(r).toBe(true);
  });

  it("matches names case-insensitively", async () => {
    const supabase = makeSupabaseMock({
      enrollments: enrollments([
        { id: "e1", classes: { id: "c-mon", name: "advanced 2" } },
      ]),
    });
    const r = await studentHasActiveEnrollmentForClassName(
      supabase,
      "s1",
      "Advanced 2",
    );
    expect(r).toBe(true);
  });

  it("returns false for a different programme name", async () => {
    const supabase = makeSupabaseMock({
      enrollments: enrollments([
        { id: "e1", classes: { id: "c-mon", name: "Beginner 1" } },
      ]),
    });
    const r = await studentHasActiveEnrollmentForClassName(
      supabase,
      "s1",
      "Advanced 2",
    );
    expect(r).toBe(false);
  });

  it("can exclude a class row from the match", async () => {
    const supabase = makeSupabaseMock({
      enrollments: enrollments([
        { id: "e1", classes: { id: "c-mon", name: "Advanced 2" } },
      ]),
    });
    const r = await studentHasActiveEnrollmentForClassName(
      supabase,
      "s1",
      "Advanced 2",
      { excludeClassId: "c-mon" },
    );
    expect(r).toBe(false);
  });
});

describe("enrollmentBillableCents", () => {
  it("returns 0 for free classes", async () => {
    const supabase = makeSupabaseMock({ enrollments: enrollments([]) });
    expect(await enrollmentBillableCents(supabase, "s1", "Advanced 2", 0)).toBe(0);
  });

  it("returns full price for the first day of a programme", async () => {
    const supabase = makeSupabaseMock({ enrollments: enrollments([]) });
    expect(await enrollmentBillableCents(supabase, "s1", "Advanced 2", 12000)).toBe(
      12000,
    );
  });

  it("returns 0 when the student is already in the same programme", async () => {
    const supabase = makeSupabaseMock({
      enrollments: enrollments([
        { id: "e1", classes: { id: "c-mon", name: "Advanced 2" } },
      ]),
    });
    expect(await enrollmentBillableCents(supabase, "s1", "Advanced 2", 12000)).toBe(0);
  });
});
