import { describe, it, expect } from "vitest";
import {
  splitTermInstallments,
  nextInstallmentAmountCents,
  TERM_INSTALLMENT_COUNT,
} from "@/lib/term-payments";

describe("splitTermInstallments", () => {
  it("splits $300 term into three $100 instalments", () => {
    expect(splitTermInstallments(30000, 3)).toEqual([10000, 10000, 10000]);
  });

  it("puts remainder cents on the final instalment", () => {
    expect(splitTermInstallments(10000, 3)).toEqual([3333, 3333, 3334]);
  });

  it("defaults to 3 instalments", () => {
    expect(splitTermInstallments(9000)).toHaveLength(TERM_INSTALLMENT_COUNT);
  });
});

describe("nextInstallmentAmountCents", () => {
  it("returns the next slice", () => {
    expect(nextInstallmentAmountCents([3333, 3333, 3334], 1)).toBe(3333);
  });

  it("returns null when complete", () => {
    expect(nextInstallmentAmountCents([100, 100, 100], 3)).toBeNull();
  });
});
