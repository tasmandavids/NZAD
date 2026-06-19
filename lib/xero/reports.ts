import type { MonthlyPlPoint, PlSummary, XeroActivityRow } from "./types";

type ReportCell = { value?: string };
type ReportRows = {
  title?: string;
  rowType?: string;
  cells?: ReportCell[];
  rows?: ReportRows[];
};
type ReportWithRow = { rows?: ReportRows[] };

function parseMoney(value: string | undefined | null): number {
  if (!value) return 0;
  const cleaned = value.replace(/[^0-9.-]/g, "");
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

function rowLabel(row: ReportRows): string {
  return (row.title ?? row.cells?.[0]?.value ?? "").trim().toLowerCase();
}

function rowValues(row: ReportRows): number[] {
  const cells = row.cells ?? [];
  const valueCells = cells.length > 1 ? cells.slice(1) : cells;
  return valueCells.map((cell) => parseMoney(cell.value));
}

function findSummaryRow(rows: ReportRows[] | undefined, titles: string[]): number[] | null {
  if (!rows) return null;

  for (const row of rows) {
    const label = rowLabel(row);
    const rowType = String(row.rowType ?? "").toLowerCase();
    const matchesTitle = titles.some((t) => label.includes(t.toLowerCase()));

    // Xero puts summary labels in cells[0] (SummaryRow), not always in title.
    if (
      matchesTitle &&
      (rowType.includes("summary") || rowType === "row" || rowType === "")
    ) {
      const values = rowValues(row);
      if (values.length) return values;
    }

    const nested = findSummaryRow(row.rows as unknown as ReportRows[], titles);
    if (nested) return nested;
  }
  return null;
}

function monthKeyFromTitle(title: string | undefined, fallbackIndex: number): string {
  if (!title) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - (11 - fallbackIndex));
    return d.toISOString().slice(0, 7);
  }
  const parsed = Date.parse(title);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toISOString().slice(0, 7);
  }
  return title.slice(0, 7);
}

export function parseProfitAndLossReport(report: unknown): PlSummary {
  const typed = report as ReportWithRow | undefined;
  const rows = typed?.rows ?? [];
  const incomeValues = findSummaryRow(rows, [
    "total income",
    "total revenue",
    "total trading income",
    "gross profit",
  ]) ?? [];
  const expenseValues = findSummaryRow(rows, [
    "total operating expenses",
    "total expenses",
    "total expenditure",
  ]) ?? [];
  const netValues = findSummaryRow(rows, [
    "net profit",
    "net income",
    "surplus",
  ]) ?? [];

  const headerRow = rows.find((r) => String(r.rowType ?? "").toLowerCase().includes("header"));
  const monthTitles = (headerRow?.cells ?? []).slice(1).map((c) => c.value ?? "");

  const periodCount = Math.max(incomeValues.length, expenseValues.length, monthTitles.length, 1);
  const monthlySeries: MonthlyPlPoint[] = [];

  for (let i = 0; i < periodCount; i++) {
    monthlySeries.push({
      month: monthKeyFromTitle(monthTitles[i], i),
      incomeCents: incomeValues[i] ?? 0,
      expenseCents: expenseValues[i] ?? 0,
    });
  }

  const lastIdx = Math.max(periodCount - 1, 0);
  const incomeMtdCents =
    periodCount === 1 ? (incomeValues[0] ?? 0) : (incomeValues[lastIdx] ?? 0);
  const expenseMtdCents =
    periodCount === 1 ? (expenseValues[0] ?? 0) : (expenseValues[lastIdx] ?? 0);
  const netMtdCents =
    netValues[lastIdx] ??
    netValues[0] ??
    incomeMtdCents - expenseMtdCents;

  const incomeYtdCents =
    periodCount === 1
      ? (incomeValues[0] ?? 0)
      : incomeValues.reduce((s, v) => s + v, 0);
  const expenseYtdCents =
    periodCount === 1
      ? (expenseValues[0] ?? 0)
      : expenseValues.reduce((s, v) => s + v, 0);
  const netYtdCents =
    periodCount === 1
      ? (netValues[0] ?? incomeYtdCents - expenseYtdCents)
      : netValues.reduce((s, v) => s + v, 0) || incomeYtdCents - expenseYtdCents;

  return {
    incomeMtdCents,
    incomeYtdCents,
    expenseMtdCents,
    expenseYtdCents,
    netMtdCents,
    netYtdCents,
    monthlySeries,
  };
}

export function mapRecentInvoices(invoices: unknown[] | undefined): XeroActivityRow[] {
  return (invoices ?? []).slice(0, 10).map((raw) => {
    const inv = raw as {
      invoiceID?: string;
      invoiceNumber?: string;
      contact?: { name?: string };
      total?: number;
      date?: string;
      status?: string;
    };
    return {
      id: inv.invoiceID ?? inv.invoiceNumber ?? cryptoRandom(),
      type: "invoice" as const,
      reference: inv.invoiceNumber ?? inv.invoiceID ?? "Invoice",
      contactName: inv.contact?.name ?? null,
      amountCents: Math.round((inv.total ?? 0) * 100),
      date: inv.date ?? new Date().toISOString().slice(0, 10),
      status: inv.status != null ? String(inv.status) : null,
    };
  });
}

function cryptoRandom(): string {
  return `tmp-${Math.random().toString(36).slice(2)}`;
}

export function centsFromDollars(amount: number): number {
  return Math.round(amount * 100);
}

export function dollarsFromCents(cents: number): number {
  return Math.round(cents) / 100;
}
