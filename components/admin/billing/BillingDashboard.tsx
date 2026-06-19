"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  InvoiceRow,
  ParentOption,
  RevenueSeries,
  SourceBreakdown,
  UnpaidAccount,
} from "@/app/portal/admin/billing/page";
import {
  createInvoice,
  sendBulkPaymentReminders,
  sendPaymentReminder,
} from "@/app/portal/admin/billing/actions";
import { refundSale } from "@/app/portal/admin/billing/refund-actions";
import { openInXeroUrl } from "@/lib/xero/links";
import { formatMoney } from "@/lib/currency";
import { formatMonthKey, formatShortDate } from "@/lib/xero/format";

const NZD = new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 });
const NZD2 = new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD" });

const STATUS_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  paid: { label: "Paid", bg: "#dcfce7", text: "#16a34a" },
  sent: { label: "Sent", bg: "#fef9c3", text: "#ca8a04" },
  overdue: { label: "Overdue", bg: "#fee2e2", text: "#dc2626" },
  draft: { label: "Draft", bg: "#f1f5f9", text: "#64748b" },
  void: { label: "Void", bg: "#f1f5f9", text: "#94a3b8" },
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

function defaultDueDate() {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
}

function CreateInvoiceModal({
  parents,
  onClose,
  onCreated,
}: {
  parents: ParentOption[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [payerId, setPayerId] = useState(parents[0]?.id ?? "");
  const [studentId, setStudentId] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [description, setDescription] = useState("");
  const [sendNow, setSendNow] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selectedParent = parents.find((p) => p.id === payerId);
  const students = selectedParent?.students ?? [];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const dollars = Number.parseFloat(amount);
    if (!payerId) return setError("Select a parent.");
    if (!Number.isFinite(dollars) || dollars <= 0) return setError("Enter a valid amount.");

    startTransition(async () => {
      const res = await createInvoice({
        payerId,
        studentId: studentId || undefined,
        amountDollars: dollars,
        dueDate,
        description: description.trim() || undefined,
        sendNow,
      });
      if (!res.ok) setError(res.error);
      else {
        if (res.xeroError) {
          setError(`Invoice created, but Xero sync failed: ${res.xeroError}`);
        }
        onCreated();
        if (!res.xeroError) onClose();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-[--hair] bg-surface p-6 shadow-xl">
        <h2 className="text-lg font-bold text-ink">Create invoice</h2>
        <p className="mt-1 text-sm text-muted">
          Bill a parent for tuition, fees, or other charges. They&apos;ll get a notification to pay in Olune.
        </p>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
            Parent
            <select
              value={payerId}
              onChange={(e) => {
                setPayerId(e.target.value);
                setStudentId("");
              }}
              className="mt-1 w-full rounded-lg border border-[--hair] bg-base px-3 py-2 text-sm text-ink"
            >
              {parents.length === 0 && <option value="">No parents found</option>}
              {parents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.email ? ` · ${p.email}` : ""}
                </option>
              ))}
            </select>
          </label>

          {students.length > 0 && (
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
              Student <span className="font-normal normal-case">(optional)</span>
              <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[--hair] bg-base px-3 py-2 text-sm text-ink"
              >
                <option value="">— Not linked to a student —</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
              Amount (NZD)
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="120.00"
                className="mt-1 w-full rounded-lg border border-[--hair] bg-base px-3 py-2 text-sm text-ink"
                required
              />
            </label>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
              Due date
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[--hair] bg-base px-3 py-2 text-sm text-ink"
                required
              />
            </label>
          </div>

          <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
            Description
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Term 2 tuition, costume fee…"
              className="mt-1 w-full rounded-lg border border-[--hair] bg-base px-3 py-2 text-sm text-ink"
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={sendNow}
              onChange={(e) => setSendNow(e.target.checked)}
              className="rounded border-[--hair]"
            />
            Send to parent now (email + in-app notification)
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[--hair] px-4 py-2 text-sm font-semibold text-muted hover:bg-base"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending || parents.length === 0}
              className="rounded-xl bg-ink px-4 py-2 text-sm font-bold text-paper disabled:opacity-50"
            >
              {pending ? "Creating…" : sendNow ? "Create & send" : "Save draft"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RemindButton({
  invoiceId,
  label = "Remind",
  onDone,
}: {
  invoiceId: string;
  label?: string;
  onDone?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setErr(null);
          startTransition(async () => {
            const res = await sendPaymentReminder(invoiceId);
            if (!res.ok) setErr(res.error);
            else onDone?.();
          });
        }}
        className="rounded-lg border border-[--hair] bg-base px-2.5 py-1 text-[0.7rem] font-semibold text-ink hover:bg-surface disabled:opacity-50"
      >
        {pending ? "Sending…" : label}
      </button>
      {err && <p className="mt-0.5 text-[0.65rem] text-red-600">{err}</p>}
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

  return (
    <div className="flex flex-col items-start gap-0.5">
      <button
        type="button"
        onClick={() => {
          setErr(null);
          if (
            !window.confirm(
              `Refund ${NZD2.format(invoice.amountCents / 100)} to ${invoice.payerName ?? "the payer"}?`,
            )
          ) {
            return;
          }
          startTransition(async () => {
            const res = await refundSale("invoice", invoice.id);
            if (res.ok) onDone(invoice.id);
            else setErr(res.error);
          });
        }}
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
  unpaidInvoices,
  unpaidAccounts,
  parents,
  revenue,
  sources,
  mrrCents,
  activeSubs,
  totalPaidCents,
  totalOutstandingCents,
  overdueCount,
}: {
  invoices: InvoiceRow[];
  unpaidInvoices: InvoiceRow[];
  unpaidAccounts: UnpaidAccount[];
  parents: ParentOption[];
  revenue: RevenueSeries;
  sources: SourceBreakdown;
  mrrCents: number;
  activeSubs: number;
  totalPaidCents: number;
  totalOutstandingCents: number;
  overdueCount: number;
}) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [invoices, setInvoices] = useState<InvoiceRow[]>(initialInvoices);
  const [bulkPending, startBulk] = useTransition();
  const [bulkError, setBulkError] = useState<string | null>(null);

  const markRefunded = (id: string) =>
    setInvoices((prev) => prev.map((i) => (i.id === id ? { ...i, status: "refunded" } : i)));

  const refresh = () => router.refresh();

  const overdueIds = useMemo(
    () => unpaidInvoices.filter((i) => i.status === "overdue").map((i) => i.id),
    [unpaidInvoices],
  );

  const remindAllOverdue = () => {
    setBulkError(null);
    startBulk(async () => {
      const res = await sendBulkPaymentReminders(overdueIds);
      if (!res.ok) setBulkError(res.error);
      else refresh();
    });
  };

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
    month: formatMonthKey(r.month),
    revenue: r.revenueCents / 100,
  }));

  const sourceTotal = sources.tuitionCents + sources.shopCents + sources.eventsCents;

  return (
    <>
      {showCreate && (
        <CreateInvoiceModal
          parents={parents}
          onClose={() => setShowCreate(false)}
          onCreated={refresh}
        />
      )}

      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
        className="mx-auto max-w-6xl space-y-8 p-6"
      >
        <motion.header
          variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
          className="flex flex-wrap items-start justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl font-black tracking-tight text-ink">Billing</h1>
            <p className="mt-1 text-sm text-muted">
              Create invoices, track who owes you, and chase payments — revenue detail lives in Accounting.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-paper shadow-sm hover:opacity-90"
          >
            + Create invoice
          </button>
        </motion.header>

        <motion.div
          variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <StatCard
            label="Outstanding"
            value={NZD.format(totalOutstandingCents / 100)}
            sub={`${unpaidInvoices.length} unpaid · ${overdueCount} overdue`}
          />
          <StatCard
            label="Families owing"
            value={String(unpaidAccounts.length)}
            sub={overdueCount > 0 ? "Prioritise overdue first" : "All current"}
          />
          <StatCard label="Collected (YTD)" value={NZD.format(totalPaidCents / 100)} sub="Paid tuition invoices" />
          <StatCard label="MRR" value={NZD.format(mrrCents / 100)} sub={`${activeSubs} on auto-pay`} />
        </motion.div>

        {/* Payment reminders queue */}
        <motion.section
          variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
          className="rounded-2xl border border-[--hair] bg-surface"
        >
          <div className="flex flex-wrap items-center gap-3 border-b border-[--hair] px-6 py-4">
            <div className="mr-auto">
              <h2 className="text-sm font-bold text-ink">Payment reminders</h2>
              <p className="text-xs text-muted">Unpaid invoices — send a nudge to pay via the parent portal</p>
            </div>
            {overdueIds.length > 0 && (
              <button
                type="button"
                onClick={remindAllOverdue}
                disabled={bulkPending}
                className="rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                {bulkPending ? "Sending…" : `Remind all overdue (${overdueIds.length})`}
              </button>
            )}
          </div>

          {bulkError && (
            <p className="border-b border-[--hair] px-6 py-2 text-sm text-red-600">{bulkError}</p>
          )}

          {unpaidInvoices.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted">No outstanding invoices — you&apos;re all caught up.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-[--hair]">
                    {["Parent", "Student", "Amount", "Due", "Status", ""].map((h) => (
                      <th
                        key={h || "actions"}
                        className="px-4 py-3 text-left text-[0.62rem] font-semibold uppercase tracking-wider text-muted"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {unpaidInvoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className={`border-b border-[--hair] last:border-0 ${
                        inv.status === "overdue" ? "bg-red-50/40" : ""
                      }`}
                    >
                      <td className="px-4 py-3 font-medium text-ink">{inv.payerName ?? "—"}</td>
                      <td className="px-4 py-3 text-muted">{inv.studentName ?? "—"}</td>
                      <td className="px-4 py-3 font-semibold tabular-nums">{formatMoney(inv.amountCents)}</td>
                      <td className="px-4 py-3 text-muted">
                        {inv.dueDate ? formatShortDate(inv.dueDate) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className="px-4 py-3">
                        <RemindButton
                          invoiceId={inv.id}
                          label={inv.status === "overdue" ? "Chase payment" : "Send reminder"}
                          onDone={refresh}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.section>

        {/* Unpaid by account */}
        {unpaidAccounts.length > 0 && (
          <motion.section
            variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
            className="rounded-2xl border border-[--hair] bg-surface p-6"
          >
            <h2 className="text-sm font-bold text-ink">Accounts to follow up</h2>
            <p className="mt-1 text-xs text-muted">Grouped by family — largest overdue balances first</p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {unpaidAccounts.slice(0, 8).map((acct) => (
                <li
                  key={acct.payerId}
                  className="flex items-center justify-between rounded-xl border border-[--hair] bg-base px-4 py-3"
                >
                  <div>
                    <p className="font-semibold text-ink">{acct.payerName}</p>
                    <p className="text-xs text-muted">
                      {acct.invoiceCount} invoice{acct.invoiceCount !== 1 ? "s" : ""}
                      {acct.oldestDueDate ? ` · oldest due ${formatShortDate(acct.oldestDueDate)}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold tabular-nums text-ink">{formatMoney(acct.totalCents)}</p>
                    {acct.overdueCents > 0 && (
                      <p className="text-[0.65rem] font-semibold text-red-600">
                        {formatMoney(acct.overdueCents)} overdue
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </motion.section>
        )}

        {/* Collapsible revenue insights */}
        <motion.section variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}>
          <button
            type="button"
            onClick={() => setShowInsights((v) => !v)}
            className="flex w-full items-center justify-between rounded-2xl border border-[--hair] bg-surface px-6 py-4 text-left"
          >
            <div>
              <h2 className="text-sm font-bold text-ink">Revenue insights</h2>
              <p className="text-xs text-muted">Charts &amp; breakdown — expand when you need the numbers</p>
            </div>
            <span className="text-muted">{showInsights ? "▲" : "▼"}</span>
          </button>

          {showInsights && (
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border border-[--hair] bg-surface p-6">
                <div className="mb-4 flex items-baseline justify-between">
                  <h3 className="text-sm font-bold text-ink">Revenue by source</h3>
                  <span className="text-xs text-muted">Last 12 months · {NZD.format(sourceTotal / 100)}</span>
                </div>
                {sourceTotal === 0 ? (
                  <p className="text-sm text-muted">No paid revenue recorded yet.</p>
                ) : (
                  <ul className="grid gap-2 sm:grid-cols-3">
                    {[
                      { label: "Tuition & fees", cents: sources.tuitionCents },
                      { label: "Merchandise", cents: sources.shopCents },
                      { label: "Events", cents: sources.eventsCents },
                    ].map((s) => (
                      <li key={s.label} className="flex justify-between text-xs">
                        <span className="text-muted">{s.label}</span>
                        <span className="font-semibold tabular-nums">{formatMoney(s.cents)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-2xl border border-[--hair] bg-surface p-6">
                <h3 className="mb-5 text-sm font-bold text-ink">Monthly tuition revenue</h3>
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
              </div>
            </div>
          )}
        </motion.section>

        {/* All invoices */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }}
          className="rounded-2xl border border-[--hair] bg-surface"
        >
          <div className="flex flex-wrap items-center gap-3 border-b border-[--hair] px-6 py-4">
            <h2 className="mr-auto text-sm font-bold text-ink">
              All invoices
              <span className="ml-2 font-normal text-muted">({filtered.length})</span>
            </h2>
            <input
              type="text"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-44 rounded-lg border border-[--hair] bg-base px-3 py-1.5 text-xs text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-[--brand]"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-[--hair] bg-base px-3 py-1.5 text-xs text-ink"
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
                  {["Dancer", "Parent", "Amount", "Status", "Due", "Paid", ""].map((h, idx) => (
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
                      className="border-b border-[--hair] last:border-0 hover:bg-[color-mix(in_srgb,var(--brand)_3%,transparent)]"
                    >
                      <td className="px-4 py-3 text-ink">{inv.studentName ?? <span className="text-muted">—</span>}</td>
                      <td className="px-4 py-3 text-muted">{inv.payerName ?? "—"}</td>
                      <td className="px-4 py-3 font-semibold tabular-nums">{formatMoney(inv.amountCents)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {inv.dueDate ? formatShortDate(inv.dueDate) : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {inv.paidAt ? formatShortDate(inv.paidAt.slice(0, 10)) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1">
                          {["sent", "overdue"].includes(inv.status) && (
                            <RemindButton invoiceId={inv.id} onDone={refresh} />
                          )}
                          <RefundButton invoice={inv} onDone={markRefunded} />
                          {inv.xeroInvoiceId && (
                            <a
                              href={openInXeroUrl(null, "invoice", inv.xeroInvoiceId)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[0.65rem] font-semibold text-[#13B5EA] hover:underline"
                            >
                              View in Xero
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}
