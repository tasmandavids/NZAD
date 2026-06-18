"use client";

// ============================================================================
//  BillingDashboard — admin invoice management, revenue chart, revenue-by-
//  source breakdown, MRR, and admin-initiated refunds.
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
import type { InvoiceRow, RevenueSeries, SourceBreakdown } from "@/app/portal/admin/billing/page";
import { refundSale } from "@/app/portal/admin/billing/refund-actions";

const NZD = new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 });
const NZD2 = new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD" });

const STATUS_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  paid:     { label: "Paid",     bg: "#dcfce7", text: "#16a34a" },
  sent:     { label: "Sent",     bg: "#fef9c3", text: "#ca8a04" },
  overdue:  { label: "Overdue",  bg: "#fee2e2", text: "#dc2626" },
  draft:    { label: "Draft",    bg: "#f1f5f9", text: "#64748b" },
  void:     { label: "Void",     bg: "#f1f5f9", text: "#94a3b8" },
  refunded: { label: "Refunded", bg: "#ede9fe", text: "#7c3aed" },
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

function SourceBar({ sources }: { sources: SourceBreakdown }) {
  const segments = [
    { label: "Tuition & fees", cents: sources.tuitionCents, color: "var(--brand)" },
    { label: "Merchandise", cents: sources.shopCents, color: "#0ea5e9" },
    { label: "Events", cents: sources.eventsCents, color: "#f59e0b" },
  ];
  const total = segments.reduce((s, x) => s + x.cents, 0);

  return (
    <div className="rounded-2xl border border-[--hair] bg-surface p-6">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-sm font-bold text-ink">Revenue by source</h2>
        <span className="text-xs text-muted">Last 12 months · {NZD.format(total / 100)}</span>
      </div>

      {total === 0 ? (
        <p className="py-4 text-sm text-muted">No paid revenue recorded yet.</p>
      ) : (
        <>
          <div className="mb-4 flex h-3 w-full overflow-hidden rounded-full bg-base">
            {segments.map((s) =>
              s.cents > 0 ? (
                <div
                  key={s.label}
                  style={{ width: `${(s.cents / total) * 100}%`, background: s.color }}
                  title={`${s.label}: ${NZD2.format(s.cents / 100)}`}
                />
              ) : null,
            )}
          </div>
          <ul className="grid gap-2 sm:grid-cols-3">
            {segments.map((s) => (
              <li key={s.label} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                <span className="text-xs text-muted">{s.label}</span>
                <span className="ml-auto text-xs font-semibold tabular-nums text-ink">
                  {NZD2.format(s.cents / 100)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function RefundButton({ invoice, onDone }: { invoice: InvoiceRow; onDone: (id: string) => void }) {
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  if (invoice.status !== "paid") return <span className="text-muted">—</span>;
  if (!invoice.stripePaymentIntentId) {
    return <span className="text-[0.7rem] text-muted">No card payment</span>;
  }

  const onClick = () => {
    setErr(null);
    if (
      !window.confirm(
        `Refund ${NZD2.format(invoice.amountCents / 100)} to ${invoice.payerName ?? "the payer"}? This cannot be undone.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await refundSale("invoice", invoice.id);
      if (res.ok) onDone(invoice.id);
      else setErr(res.error);
    });
  };

  return (
    <div className="flex flex-col items-start gap-0.5">
      <button
        onClick={onClick}
        disabled={pending}
        className="rounded-lg border border-[--hair] px-2.5 py-1 text-[0.7rem] font-semibold text-[#dc2626] hover:bg-[#fee2e2] disabled:opacity-50"
      >
        {pending ? "Refunding…" : "Refund"}
      </button>
      {err && <span className="text-[0.65rem] text-[#dc2626]">{err}</span>}
    </div>
  );
}

export function BillingDashboard({
  invoices: initialInvoices,
  revenue,
  sources,
  mrrCents,
  activeSubs,
  totalPaidCents,
  totalOutstandingCents,
  overdueCount,
}: {
  invoices: InvoiceRow[];
  revenue: RevenueSeries;
  sources: SourceBreakdown;
  mrrCents: number;
  activeSubs: number;
  totalPaidCents: number;
  totalOutstandingCents: number;
  overdueCount: number;
}) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [invoices, setInvoices] = useState<InvoiceRow[]>(initialInvoices);

  const markRefunded = (id: string) =>
    setInvoices((prev) => prev.map((i) => (i.id === id ? { ...i, status: "refunded" } : i)));

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
      <motion.header variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}>
        <h1 className="text-2xl font-black tracking-tight text-ink">Billing</h1>
        <p className="mt-1 text-sm text-muted">Invoices, payments, revenue &amp; refunds</p>
      </motion.header>

      {/* Stats row */}
      <motion.div
        variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard label="Revenue this year" value={NZD.format(totalPaidCents / 100)} sub="All paid invoices" />
        <StatCard label="MRR" value={NZD.format(mrrCents / 100)} sub={`${activeSubs} active auto-pay`} />
        <StatCard label="Outstanding" value={NZD.format(totalOutstandingCents / 100)} sub={`${overdueCount} overdue`} />
        <StatCard
          label="Total invoices"
          value={String(invoices.length)}
          sub={`${invoices.filter((i) => i.status === "paid").length} paid`}
        />
      </motion.div>

      {/* Revenue by source */}
      <motion.div variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }}>
        <SourceBar sources={sources} />
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
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
            <YAxis
              tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
              tick={{ fontSize: 11, fill: "var(--muted)" }}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <Tooltip
              formatter={(value: unknown) => [NZD2.format(Number(value)), "Revenue"]}
              contentStyle={{ background: "var(--base)", border: "1px solid var(--hair)", borderRadius: 12, fontSize: 12 }}
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
            <option value="refunded">Refunded</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-[--hair]">
                {["Dancer", "Parent", "Amount", "Status", "Issued", "Paid", ""].map((h, idx) => (
                  <th
                    key={h || `col-${idx}`}
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
                    <td className="px-4 py-3 text-muted">{inv.payerName ?? "—"}</td>
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
                      {inv.paidAt
                        ? new Date(inv.paidAt).toLocaleDateString("en-NZ", { day: "numeric", month: "short" })
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <RefundButton invoice={inv} onDone={markRefunded} />
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
