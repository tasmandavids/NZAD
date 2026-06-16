"use client";

// ============================================================================
//  BillingDashboard — admin invoice management + monthly revenue chart.
//  Uses Recharts for the bar chart.
// ============================================================================

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { InvoiceRow, RevenueSeries } from "@/app/portal/admin/billing/page";

const NZD = new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 });
const NZD2 = new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD" });

const STATUS_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  paid:    { label: "Paid",    bg: "#dcfce7", text: "#16a34a" },
  sent:    { label: "Sent",    bg: "#fef9c3", text: "#ca8a04" },
  overdue: { label: "Overdue", bg: "#fee2e2", text: "#dc2626" },
  draft:   { label: "Draft",   bg: "#f1f5f9", text: "#64748b" },
  void:    { label: "Void",    bg: "#f1f5f9", text: "#94a3b8" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? { label: status, bg: "#f1f5f9", text: "#64748b" };
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.62rem] font-semibold uppercase tracking-wider"
      style={{ background: s.bg, color: s.text }}
    >
      {s.label}
    </span>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-[--hair] bg-surface p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 text-2xl font-black text-ink">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  );
}

export function BillingDashboard({
  invoices,
  revenue,
  totalPaidCents,
  totalOutstandingCents,
  overdueCount,
}: {
  invoices: InvoiceRow[];
  revenue: RevenueSeries;
  totalPaidCents: number;
  totalOutstandingCents: number;
  overdueCount: number;
}) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filtered = invoices.filter((inv) => {
    if (statusFilter !== "all" && inv.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        inv.studentName?.toLowerCase().includes(q) ||
        inv.payerName?.toLowerCase().includes(q) ||
        inv.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const chartData = revenue.map((r) => ({
    month: new Date(r.month + "-01").toLocaleDateString("en-NZ", { month: "short" }),
    revenue: r.revenueCents / 100,
  }));

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
      className="mx-auto max-w-6xl space-y-8 p-6"
    >
      {/* Header */}
      <motion.header
        variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
      >
        <h1 className="text-2xl font-black tracking-tight text-ink">Billing</h1>
        <p className="mt-1 text-sm text-muted">Invoices, payments &amp; revenue</p>
      </motion.header>

      {/* Stats row */}
      <motion.div
        variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
        className="grid gap-4 sm:grid-cols-3"
      >
        <StatCard
          label="Revenue this year"
          value={NZD.format(totalPaidCents / 100)}
          sub="All paid invoices"
        />
        <StatCard
          label="Outstanding"
          value={NZD.format(totalOutstandingCents / 100)}
          sub={`${overdueCount} overdue`}
        />
        <StatCard
          label="Total invoices"
          value={String(invoices.length)}
          sub={`${invoices.filter((i) => i.status === "paid").length} paid`}
        />
      </motion.div>

      {/* Revenue chart */}
      <motion.div
        variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }}
        className="rounded-2xl border border-[--hair] bg-surface p-6"
      >
        <h2 className="mb-5 text-sm font-bold text-ink">Monthly revenue (last 12 months)</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--hair)" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "var(--muted)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
              tick={{ fontSize: 11, fill: "var(--muted)" }}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <Tooltip
              formatter={(value: unknown) => [NZD2.format(Number(value)), "Revenue"]}
              contentStyle={{
                background: "var(--base)",
                border: "1px solid var(--hair)",
                borderRadius: 12,
                fontSize: 12,
              }}
            />
            <Bar dataKey="revenue" fill="var(--brand)" radius={[4, 4, 0, 0]} maxBarSize={48} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Invoice table */}
      <motion.div
        variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }}
        className="rounded-2xl border border-[--hair] bg-surface"
      >
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-[--hair] px-6 py-4">
          <h2 className="mr-auto text-sm font-bold text-ink">
            Invoices
            <span className="ml-2 text-muted font-normal">({filtered.length})</span>
          </h2>
          <input
            type="text"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-[--hair] bg-base px-3 py-1.5 text-xs text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-[--brand] w-44"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-[--hair] bg-base px-3 py-1.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-[--brand]"
          >
            <option value="all">All statuses</option>
            <option value="paid">Paid</option>
            <option value="sent">Sent</option>
            <option value="overdue">Overdue</option>
            <option value="draft">Draft</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-[--hair]">
                {["Dancer", "Parent", "Amount", "Status", "Issued", "Due", "Paid"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-[0.62rem] font-semibold uppercase tracking-wider text-muted"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted">
                    No invoices found.
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-b border-[--hair] last:border-0 hover:bg-[color-mix(in_srgb,var(--brand)_3%,transparent)] transition-colors"
                  >
                    <td className="px-4 py-3 text-ink">
                      {inv.studentName ?? <span className="text-muted">—</span>}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {inv.payerName ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-semibold tabular-nums text-ink">
                      {NZD2.format(inv.amountCents / 100)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {inv.issuedAt
                        ? new Date(inv.issuedAt).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "2-digit" })
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {inv.dueDate
                        ? new Date(inv.dueDate).toLocaleDateString("en-NZ", { day: "numeric", month: "short" })
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {inv.paidAt
                        ? new Date(inv.paidAt).toLocaleDateString("en-NZ", { day: "numeric", month: "short" })
                        : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}
