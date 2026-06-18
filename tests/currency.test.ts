import { describe, it, expect } from "vitest";
import {
  CURRENCY,
  CURRENCY_CODE,
  GST_RATE,
  formatMoney,
  gstComponentCents,
} from "@/lib/currency";

describe("currency constants", () => {
  it("charges and displays the same currency (NZD)", () => {
    expect(CURRENCY).toBe("nzd");
    expect(CURRENCY_CODE).toBe("NZD");
  });

  it("uses the NZ GST rate", () => {
    expect(GST_RATE).toBe(0.15);
  });
});

describe("formatMoney", () => {
  it("formats integer cents as dollars", () => {
    // en-NZ uses "$" for NZD with no narrow space.
    expect(formatMoney(2000)).toBe("$20.00");
    expect(formatMoney(1999)).toBe("$19.99");
    expect(formatMoney(0)).toBe("$0.00");
  });

  it("treats nullish cents as zero (no NaN leaks)", () => {
    // formatMoney guards `cents ?? 0`.
    expect(formatMoney(undefined as unknown as number)).toBe("$0.00");
  });
});

describe("gstComponentCents (15% inclusive)", () => {
  it("extracts the embedded GST from a gross amount", () => {
    // $115.00 gross → $15.00 GST component.
    expect(gstComponentCents(11500)).toBe(1500);
  });

  it("rounds to the nearest cent", () => {
    // 2000 - 2000/1.15 = 260.86… → 261
    expect(gstComponentCents(2000)).toBe(261);
  });

  it("returns 0 for a zero charge", () => {
    expect(gstComponentCents(0)).toBe(0);
  });
});
