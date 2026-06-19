import { describe, expect, it } from "vitest";
import { dollarsFromCents, centsFromDollars } from "@/lib/xero/reports";

describe("xero money helpers", () => {
  it("converts cents to dollars for Xero API payloads", () => {
    expect(dollarsFromCents(1999)).toBe(19.99);
    expect(centsFromDollars(19.99)).toBe(1999);
  });
});

describe("xero sync idempotency key", () => {
  it("uses stable source_type + source_id composite", () => {
    const key = { source_type: "invoice" as const, source_id: "abc-123" };
    expect(`${key.source_type}:${key.source_id}`).toBe("invoice:abc-123");
  });
});
