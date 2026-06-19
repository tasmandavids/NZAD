import { describe, expect, it } from "vitest";
import {
  chargeAmountCents,
  discountCents,
  lineTotalCents,
  monthlyAmountCents,
  stripeRecurring,
} from "@/lib/subscriptions/pricing";

describe("subscription pricing", () => {
  it("sums line totals into monthly amount", () => {
    const lines = [
      { itemType: "class" as const, description: "Ballet", quantity: 1, unitMonthlyCents: 8000 },
      { itemType: "product" as const, description: "Uniform", quantity: 1, unitMonthlyCents: 2000 },
      { itemType: "discount" as const, description: "Sibling", quantity: 1, unitMonthlyCents: -1000 },
    ];
    expect(lineTotalCents(lines[0])).toBe(8000);
    expect(monthlyAmountCents(lines)).toBe(9000);
    expect(discountCents(lines)).toBe(1000);
  });

  it("derives weekly and fortnightly charges from monthly total", () => {
    const monthly = 5200;
    expect(chargeAmountCents(monthly, "month")).toBe(5200);
    expect(chargeAmountCents(monthly, "fortnight")).toBe(Math.round((monthly * 12) / 26));
    expect(chargeAmountCents(monthly, "week")).toBe(Math.round((monthly * 12) / 52));
  });

  it("maps billing intervals to Stripe recurring config", () => {
    expect(stripeRecurring("month")).toEqual({ interval: "month", interval_count: 1 });
    expect(stripeRecurring("week")).toEqual({ interval: "week", interval_count: 1 });
    expect(stripeRecurring("fortnight")).toEqual({ interval: "week", interval_count: 2 });
  });
});
