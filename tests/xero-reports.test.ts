import { describe, expect, it } from "vitest";
import { parseProfitAndLossReport } from "@/lib/xero/reports";
import { openInXeroUrl } from "@/lib/xero/links";

describe("parseProfitAndLossReport", () => {
  it("extracts income, expenses and monthly series from nested rows", () => {
    const report = {
      rows: [
        {
          rowType: "Header",
          cells: [{ value: "" }, { value: "Jan 2026" }, { value: "Feb 2026" }],
        },
        {
          rows: [
            {
              title: "Total Income",
              cells: [{ value: "" }, { value: "1,000.00" }, { value: "2,500.00" }],
            },
            {
              title: "Total Operating Expenses",
              cells: [{ value: "" }, { value: "400.00" }, { value: "600.00" }],
            },
            {
              title: "Net Profit",
              cells: [{ value: "" }, { value: "600.00" }, { value: "1,900.00" }],
            },
          ],
        },
      ],
    };

    const summary = parseProfitAndLossReport(report);
    expect(summary.incomeMtdCents).toBe(250_000);
    expect(summary.expenseMtdCents).toBe(60_000);
    expect(summary.netMtdCents).toBe(190_000);
    expect(summary.incomeYtdCents).toBe(350_000);
    expect(summary.monthlySeries).toHaveLength(2);
    expect(summary.monthlySeries[0].incomeCents).toBe(100_000);
  });

  it("reads Xero SummaryRow labels from cells[0]", () => {
    const report = {
      rows: [
        {
          rowType: "Header",
          cells: [{ value: "" }, { value: "May 2026" }, { value: "Jun 2026" }],
        },
        {
          rowType: "Section",
          title: " Income",
          rows: [
            {
              rowType: "SummaryRow",
              cells: [{ value: "Total Income" }, { value: "5,000.00" }, { value: "7,500.00" }],
            },
          ],
        },
        {
          rowType: "Section",
          rows: [
            {
              rowType: "SummaryRow",
              cells: [
                { value: "Total Operating Expenses" },
                { value: "2,000.00" },
                { value: "3,000.00" },
              ],
            },
            {
              rowType: "Row",
              cells: [{ value: "NET PROFIT" }, { value: "3,000.00" }, { value: "4,500.00" }],
            },
          ],
        },
      ],
    };

    const summary = parseProfitAndLossReport(report);
    expect(summary.incomeMtdCents).toBe(750_000);
    expect(summary.expenseMtdCents).toBe(300_000);
    expect(summary.netMtdCents).toBe(450_000);
  });
});

describe("openInXeroUrl", () => {
  it("builds org dashboard links when short code is present", () => {
    expect(openInXeroUrl("AbCd12", "dashboard")).toBe("https://go.xero.com/app/!AbCd12/Dashboard");
  });

  it("builds invoice deep links", () => {
    expect(openInXeroUrl("AbCd12", "invoice", "inv-123")).toBe(
      "https://go.xero.com/AccountsReceivable/View.aspx?InvoiceID=inv-123",
    );
  });

  it("falls back to xero home without short code", () => {
    expect(openInXeroUrl(null, "dashboard")).toBe("https://go.xero.com/");
  });
});
