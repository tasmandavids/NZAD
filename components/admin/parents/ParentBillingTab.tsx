"use client";

import type { ParentInvoice, ParentOrder, ParentPayment } from "@/lib/parents/types";
import { formatMoney } from "@/lib/currency";

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

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ParentBillingTab({
  invoices,
  payments,
  orders,
}: {
  invoices: ParentInvoice[];
  payments: ParentPayment[];
  orders: ParentOrder[];
}) {
  const outstanding = invoices
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .reduce((sum, i) => sum + i.amountCents, 0);

  const totalPaid = payments.reduce((sum, p) => sum + p.amountCents, 0);

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[--hair] bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Outstanding</p>
          <p className="mt-1 text-xl font-black text-ink">{formatMoney(outstanding)}</p>
        </div>
        <div className="rounded-2xl border border-[--hair] bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Total received</p>
          <p className="mt-1 text-xl font-black text-ink">{formatMoney(totalPaid)}</p>
        </div>
        <div className="rounded-2xl border border-[--hair] bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Invoices</p>
          <p className="mt-1 text-xl font-black text-ink">{invoices.length}</p>
        </div>
      </div>

      <section>
        <h3 className="mb-3 text-sm font-bold text-ink">Invoices</h3>
        {invoices.length === 0 ? (
          <p className="text-sm italic text-muted">No invoices yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[--hair]">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-[--hair] bg-surface/60 text-xs uppercase tracking-wider text-muted">
                  <th className="px-4 py-3 font-semibold">Issued</th>
                  <th className="px-4 py-3 font-semibold">Student</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Due</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-[--hair] last:border-0">
                    <td className="px-4 py-3 text-ink">{fmtDate(inv.issuedAt)}</td>
                    <td className="px-4 py-3 text-muted">{inv.studentName ?? "—"}</td>
                    <td className="px-4 py-3 font-medium text-ink">
                      {formatMoney(inv.amountCents)}
                    </td>
                    <td className="px-4 py-3 text-muted">{fmtDate(inv.dueDate)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={inv.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-3 text-sm font-bold text-ink">Payment receipts</h3>
        {payments.length === 0 ? (
          <p className="text-sm italic text-muted">No payments recorded yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[--hair]">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-[--hair] bg-surface/60 text-xs uppercase tracking-wider text-muted">
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Invoice</th>
                  <th className="px-4 py-3 font-semibold">Reference</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-[--hair] last:border-0">
                    <td className="px-4 py-3 text-ink">{fmtDate(p.createdAt)}</td>
                    <td className="px-4 py-3 font-medium text-ink">
                      {formatMoney(p.amountCents)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted">
                      {p.invoiceId ? p.invoiceId.slice(0, 8) + "…" : "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted">
                      {p.stripePaymentIntentId?.slice(0, 16) ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {orders.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-bold text-ink">Shop orders</h3>
          <div className="overflow-x-auto rounded-2xl border border-[--hair]">
            <table className="w-full min-w-[400px] text-left text-sm">
              <thead>
                <tr className="border-b border-[--hair] bg-surface/60 text-xs uppercase tracking-wider text-muted">
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-[--hair] last:border-0">
                    <td className="px-4 py-3 text-ink">{fmtDate(o.createdAt)}</td>
                    <td className="px-4 py-3 font-medium text-ink">
                      {formatMoney(o.totalCents)}
                    </td>
                    <td className="px-4 py-3 capitalize text-muted">{o.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
