"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

const NZD = new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 2 });

export type WalletInvoice = {
  id: string;
  studentName: string | null;
  description: string | null;
  amountCents: number;
  gstCents: number;
  status: string;
  dueDate: string | null;
  issuedAt: string | null;
};

export type PaymentPlan = {
  id: string;
  name: string;
  totalCents: number;
  paidCents: number;
  nextDueCents: number | null;
  nextDueDate: string | null;
  studentName: string | null;
};

export type AutopayStatus = {
  enabled: boolean;
  cardLast4: string | null;
  cardBrand: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  paid: "#22c55e",
  sent: "var(--brand-hot)",
  overdue: "#ef4444",
  draft: "var(--muted)",
  void: "var(--muted)",
};

const STATUS_LABELS: Record<string, string> = {
  paid: "Paid",
  sent: "Due",
  overdue: "Overdue",
  draft: "Draft",
  void: "Void",
};

type Tab = "overview" | "invoices" | "plans";

export function FamilyWallet({
  invoices,
  paymentPlans,
  autopay,
  onPayInvoice,
}: {
  invoices: WalletInvoice[];
  paymentPlans: PaymentPlan[];
  autopay: AutopayStatus;
  onPayInvoice: (invoiceId: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("overview");

  const outstanding = invoices
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .reduce((s, i) => s + i.amountCents, 0);

  const overdue = invoices
    .filter((i) => i.status === "overdue")
    .reduce((s, i) => s + i.amountCents, 0);

  const paid30 = invoices
    .filter((i) => i.status === "paid" && i.issuedAt && new Date(i.issuedAt) > new Date(Date.now() - 30 * 86400000))
    .reduce((s, i) => s + i.amountCents, 0);

  const nextDue = paymentPlans
    .filter((p) => p.nextDueDate)
    .sort((a, b) => new Date(a.nextDueDate!).getTime() - new Date(b.nextDueDate!).getTime())[0];

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-ink">Family Wallet</h1>
          <p className="text-sm text-muted">Your complete financial picture in one place.</p>
        </div>
        <Link
          href="/portal/parent/billing"
          className="text-xs font-semibold text-[--brand] hover:underline"
        >
          Full billing details →
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl border p-5 ${overdue > 0 ? "border-[color-mix(in_srgb,#ef4444_40%,var(--hair))] bg-[color-mix(in_srgb,#ef4444_4%,var(--surface))]" : "border-[--hair] bg-surface"}`}
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Outstanding</p>
          <p className={`mt-1 text-2xl font-black tabular-nums ${outstanding > 0 ? "text-[--brand-hot]" : "text-ink"}`}>
            {NZD.format(outstanding / 100)}
          </p>
          {overdue > 0 && (
            <p className="mt-0.5 text-xs font-semibold text-[#ef4444]">
              {NZD.format(overdue / 100)} overdue
            </p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl border border-[--hair] bg-surface p-5"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Paid (30 days)</p>
          <p className="mt-1 text-2xl font-black tabular-nums text-[#22c55e]">
            {NZD.format(paid30 / 100)}
          </p>
          {invoices.filter((i) => i.status === "paid").length > 0 && (
            <p className="mt-0.5 text-xs text-muted">
              {invoices.filter((i) => i.status === "paid").length} invoice{invoices.filter((i) => i.status === "paid").length !== 1 ? "s" : ""} total
            </p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-[--hair] bg-surface p-5"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Autopay</p>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${autopay.enabled ? "bg-[#22c55e]" : "bg-[--muted]"}`}
            />
            <p className="text-sm font-bold text-ink">
              {autopay.enabled ? "Active" : "Off"}
            </p>
          </div>
          {autopay.enabled && autopay.cardLast4 && (
            <p className="mt-0.5 text-xs text-muted">
              {autopay.cardBrand ?? "Card"} ···· {autopay.cardLast4}
            </p>
          )}
          <Link
            href="/portal/parent/billing?tab=autopay"
            className="mt-2 block text-xs font-semibold text-[--brand] hover:underline"
          >
            {autopay.enabled ? "Manage" : "Set up autopay →"}
          </Link>
        </motion.div>
      </div>

      {/* Next payment plan due */}
      {nextDue && (
        <div className="rounded-2xl border border-[--hair] bg-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Next payment plan instalment</p>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-bold text-ink">{nextDue.name}</p>
              <p className="text-xs text-muted">{nextDue.studentName}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-black tabular-nums text-ink">
                {NZD.format((nextDue.nextDueCents ?? 0) / 100)}
              </p>
              <p className="text-xs text-muted">
                due {new Date(nextDue.nextDueDate!).toLocaleDateString("en-NZ", { day: "numeric", month: "short" })}
              </p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-3">
            <div className="flex justify-between text-[0.65rem] text-muted mb-1">
              <span>{NZD.format(nextDue.paidCents / 100)} paid</span>
              <span>{NZD.format(nextDue.totalCents / 100)} total</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--brand)_15%,transparent)]">
              <div
                className="h-full rounded-full bg-brand transition-all"
                style={{ width: `${Math.min(100, (nextDue.paidCents / nextDue.totalCents) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div>
        <div className="mb-4 flex gap-1 rounded-xl border border-[--hair] bg-surface p-1 w-fit">
          {(["overview", "invoices", "plans"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-lg px-4 py-1.5 text-xs font-semibold capitalize transition ${
                tab === t ? "bg-ink text-white" : "text-muted hover:text-ink"
              }`}
            >
              {t === "plans" ? "Payment plans" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="space-y-2">
            {invoices.filter((i) => i.status !== "paid" && i.status !== "void").length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">No outstanding invoices.</p>
            ) : (
              invoices
                .filter((i) => i.status !== "paid" && i.status !== "void")
                .map((inv) => <InvoiceRow key={inv.id} inv={inv} onPay={onPayInvoice} />)
            )}
          </div>
        )}

        {tab === "invoices" && (
          <div className="space-y-2">
            {invoices.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">No invoices yet.</p>
            ) : (
              invoices.map((inv) => <InvoiceRow key={inv.id} inv={inv} onPay={onPayInvoice} />)
            )}
          </div>
        )}

        {tab === "plans" && (
          <div className="space-y-3">
            {paymentPlans.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">No active payment plans.</p>
            ) : (
              paymentPlans.map((plan) => (
                <div key={plan.id} className="rounded-2xl border border-[--hair] bg-surface p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="font-bold text-ink">{plan.name}</p>
                      <p className="text-xs text-muted">{plan.studentName}</p>
                    </div>
                    <p className="text-sm font-semibold tabular-nums text-ink">
                      {NZD.format(plan.totalCents / 100)}
                    </p>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--brand)_15%,transparent)]">
                    <div
                      className="h-full rounded-full bg-brand transition-all"
                      style={{ width: `${Math.min(100, (plan.paidCents / plan.totalCents) * 100)}%` }}
                    />
                  </div>
                  <div className="mt-1.5 flex justify-between text-[0.65rem] text-muted">
                    <span>{NZD.format(plan.paidCents / 100)} paid</span>
                    <span>{NZD.format((plan.totalCents - plan.paidCents) / 100)} remaining</span>
                  </div>
                  {plan.nextDueDate && plan.nextDueCents && (
                    <p className="mt-2 text-xs text-muted">
                      Next instalment: <span className="font-semibold text-ink">{NZD.format(plan.nextDueCents / 100)}</span> due{" "}
                      {new Date(plan.nextDueDate).toLocaleDateString("en-NZ", { day: "numeric", month: "short" })}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function InvoiceRow({ inv, onPay }: { inv: WalletInvoice; onPay: (id: string) => void }) {
  return (
    <div
      className={`flex flex-wrap items-center gap-3 rounded-2xl border bg-surface px-5 py-4 ${
        inv.status === "overdue" ? "border-[color-mix(in_srgb,#ef4444_30%,var(--hair))]" : "border-[--hair]"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">{inv.studentName ?? "Invoice"}</p>
        {inv.description && <p className="text-xs text-muted">{inv.description}</p>}
        <p className="text-xs text-muted">
          {inv.dueDate
            ? `Due ${new Date(inv.dueDate).toLocaleDateString("en-NZ", { day: "numeric", month: "short" })}`
            : inv.issuedAt
            ? `Issued ${new Date(inv.issuedAt).toLocaleDateString("en-NZ", { day: "numeric", month: "short" })}`
            : ""}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <p className="font-bold tabular-nums text-ink">{NZD.format(inv.amountCents / 100)}</p>
        <span
          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.62rem] font-semibold text-white"
          style={{ background: STATUS_COLORS[inv.status] ?? "var(--muted)" }}
        >
          {STATUS_LABELS[inv.status] ?? inv.status}
        </span>
        {(inv.status === "sent" || inv.status === "overdue") && (
          <button
            type="button"
            onClick={() => onPay(inv.id)}
            className="rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white transition hover:opacity-90"
          >
            Pay now
          </button>
        )}
      </div>
    </div>
  );
}
