import { describe, it, expect } from "vitest";
import {
  siblingDiscountInfo,
  familyDiscountInfo,
  siblingDiscountedCents,
} from "@/lib/discounts";
import { makeSupabaseMock } from "./helpers/supabaseMock";

// Convenience builders for the three tables the discount helpers touch.
const studio = (data: Record<string, unknown> | null) => ({ single: { data } });
const guardianships = (studentIds: string[]) => ({
  list: { data: studentIds.map((student_id) => ({ student_id })) },
});
const activeEnrollments = (count: number) => ({ list: { count } });

describe("siblingDiscountInfo", () => {
  it("returns none for a free class (priceCents <= 0)", async () => {
    const supabase = makeSupabaseMock({});
    const r = await siblingDiscountInfo(supabase, "s1", "g1", "child1", 0);
    expect(r).toEqual({ applies: false, pct: 0, discountedCents: 0 });
  });

  it("returns none when the studio discount is 0", async () => {
    const supabase = makeSupabaseMock({
      studios: studio({ sibling_discount_pct: 0 }),
    });
    const r = await siblingDiscountInfo(supabase, "s1", "g1", "child1", 2000);
    expect(r.applies).toBe(false);
    expect(r.discountedCents).toBe(2000);
  });

  it("returns none when the guardian has no other children", async () => {
    const supabase = makeSupabaseMock({
      studios: studio({ sibling_discount_pct: 10 }),
      guardianships: guardianships([]),
    });
    const r = await siblingDiscountInfo(supabase, "s1", "g1", "child1", 2000);
    expect(r.applies).toBe(false);
  });

  it("returns none when siblings exist but none are actively enrolled", async () => {
    const supabase = makeSupabaseMock({
      studios: studio({ sibling_discount_pct: 10 }),
      guardianships: guardianships(["child2"]),
      enrollments: activeEnrollments(0),
    });
    const r = await siblingDiscountInfo(supabase, "s1", "g1", "child1", 2000);
    expect(r.applies).toBe(false);
    expect(r.discountedCents).toBe(2000);
  });

  it("applies the discount when a sibling is actively enrolled", async () => {
    const supabase = makeSupabaseMock({
      studios: studio({ sibling_discount_pct: 10 }),
      guardianships: guardianships(["child2"]),
      enrollments: activeEnrollments(1),
    });
    const r = await siblingDiscountInfo(supabase, "s1", "g1", "child1", 2000);
    expect(r.applies).toBe(true);
    expect(r.pct).toBe(10);
    expect(r.discountedCents).toBe(1800);
  });

  it("rounds the discounted amount to the nearest cent", async () => {
    const supabase = makeSupabaseMock({
      studios: studio({ sibling_discount_pct: 10 }),
      guardianships: guardianships(["child2"]),
      enrollments: activeEnrollments(1),
    });
    // 1999 * 90 / 100 = 1799.1 → 1799
    const r = await siblingDiscountInfo(supabase, "s1", "g1", "child1", 1999);
    expect(r.discountedCents).toBe(1799);
  });
});

describe("siblingDiscountedCents wrapper", () => {
  it("returns just the discounted cents", async () => {
    const supabase = makeSupabaseMock({
      studios: studio({ sibling_discount_pct: 25 }),
      guardianships: guardianships(["child2"]),
      enrollments: activeEnrollments(2),
    });
    const cents = await siblingDiscountedCents(supabase, "s1", "g1", "child1", 4000);
    expect(cents).toBe(3000);
  });
});

describe("familyDiscountInfo (retail: shop + events)", () => {
  it("returns none when the studio has not opted in", async () => {
    const supabase = makeSupabaseMock({
      studios: studio({ sibling_discount_pct: 10, family_discount_on_retail: false }),
    });
    const r = await familyDiscountInfo(supabase, "s1", "buyer1", 5000);
    expect(r.applies).toBe(false);
    expect(r.discountedCents).toBe(5000);
  });

  it("returns none when opted in but discount pct is 0", async () => {
    const supabase = makeSupabaseMock({
      studios: studio({ sibling_discount_pct: 0, family_discount_on_retail: true }),
    });
    const r = await familyDiscountInfo(supabase, "s1", "buyer1", 5000);
    expect(r.applies).toBe(false);
  });

  it("returns none when the buyer has no actively enrolled student", async () => {
    const supabase = makeSupabaseMock({
      studios: studio({ sibling_discount_pct: 10, family_discount_on_retail: true }),
      guardianships: guardianships(["child1"]),
      enrollments: activeEnrollments(0),
    });
    const r = await familyDiscountInfo(supabase, "s1", "buyer1", 5000);
    expect(r.applies).toBe(false);
  });

  it("applies when opted in and the buyer has an active-enrolled student", async () => {
    const supabase = makeSupabaseMock({
      studios: studio({ sibling_discount_pct: 20, family_discount_on_retail: true }),
      guardianships: guardianships(["child1"]),
      enrollments: activeEnrollments(1),
    });
    const r = await familyDiscountInfo(supabase, "s1", "buyer1", 5000);
    expect(r.applies).toBe(true);
    expect(r.discountedCents).toBe(4000);
  });
});
