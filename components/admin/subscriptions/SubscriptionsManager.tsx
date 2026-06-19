"use client";

import { useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { adminCancelSubscription } from "@/app/portal/admin/subscriptions/actions";
import type {
  ClassOption,
  ParentOption,
  ProductOption,
  SubscriptionRow,
} from "@/app/portal/admin/subscriptions/page";
import { CreateSubscriptionModal } from "@/components/admin/subscriptions/CreateSubscriptionModal";
import { formatMoney } from "@/lib/currency";
import { intervalLabel, type BillingInterval } from "@/lib/subscriptions/pricing";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-500/15 text-green-500",
  trialing: "bg-blue-500/15 text-blue-500",
  past_due: "bg-amber-500/15 text-amber-500",
  unpaid: "bg-amber-500/15 text-amber-500",
  incomplete: "bg-muted/15 text-muted",
  canceled: "bg-red-500/15 text-red-400",
};

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? "bg-muted/15 text-muted";
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider ${style}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function billingLabel(interval: string) {
  try {
    return intervalLabel(interval as BillingInterval);
  } catch {
    return interval;
  }
}

export default function SubscriptionsManager({
  subscriptions,
  parents,
  classes,
  products,
}: {
  subscriptions: SubscriptionRow[];
  parents: ParentOption[];
  classes: ClassOption[];
  products: ProductOption[];
}) {
  const [filter, setFilter] = useState<"all" | "active" | "canceled">("all");
  const [showCreate, setShowCreate] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const activeMrrCents = useMemo(
    () =>
      subscriptions
        .filter((s) => s.status === "active" || s.status === "trialing")
        .reduce((sum, s) => sum + s.monthlyAmountCents, 0),
    [subscriptions],
  );
  const activeCount = subscriptions.filter(
    (s) => s.status === "active" || s.status === "trialing",
  ).length;

  const filtered = subscriptions.filter((s) => {
    if (filter === "active") return s.status === "active" || s.status === "trialing";
    if (filter === "canceled") return s.status === "canceled";
    return true;
  });

  const cancel = (s: SubscriptionRow, immediate: boolean) => {
    if (!s.stripeSubscriptionId) return;
    setError(null);
    setPendingId(s.id);
    startTransition(async () => {
      const result = await adminCancelSubscription(s.stripeSubscriptionId as string, immediate);
      setPendingId(null);
      if (!result.ok) setError(result.error);
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-5xl space-y-6 p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-ink">Subscriptions</h1>
          <p className="text-sm text-muted">
            Auto-pay plans with monthly invoices on the 1st while active
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          disabled={parents.length === 0}
          className="rounded-xl bg-ink px-4 py-2 text-sm font-bold text-paper disabled:opacity-50"
        >
          Create subscription
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[--hair] bg-surface p-4">
          <p className="text-[0.62rem] font-semibold uppercase tracking-wider text-muted">
            Active plans
          </p>
          <p className="mt-1 text-2xl font-black tabular-nums text-ink">{activeCount}</p>
        </div>
        <div className="rounded-2xl border border-[--hair] bg-surface p-4">
          <p className="text-[0.62rem] font-semibold uppercase tracking-wider text-muted">
            Monthly recurring
          </p>
          <p className="mt-1 text-2xl font-black tabular-nums text-ink">
            {formatMoney(activeMrrCents)}
          </p>
        </div>
        <div className="rounded-2xl border border-[--hair] bg-surface p-4">
          <p className="text-[0.62rem] font-semibold uppercase tracking-wider text-muted">Total</p>
          <p className="mt-1 text-2xl font-black tabular-nums text-ink">{subscriptions.length}</p>
        </div>
      </div>

      <div className="flex gap-1.5">
        {(["all", "active", "canceled"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
              filter === f ? "text-white" : "border border-[--hair] text-muted hover:text-ink"
            }`}
            style={filter === f ? { background: "var(--brand)" } : undefined}
          >
            {f}
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-400">
          {error}
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-[--hair] bg-surface">
        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-muted">No subscriptions to show.</p>
            {parents.length > 0 && (
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="mt-3 text-sm font-semibold text-ink underline"
              >
                Create your first subscription
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-[--hair]">
                  {["Plan", "Payer", "Student", "Monthly", "Charge", "Status", "Next charge", ""].map(
                    (h) => (
                      <th
                        key={h}
                        className={`px-4 py-3 text-[0.62rem] font-semibold uppercase tracking-wider text-muted ${
                          !h ? "text-right" : ""
                        }`}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {filtered.map((s) => {
                    const canCancel =
                      s.status !== "canceled" &&
                      !s.cancelAtPeriodEnd &&
                      Boolean(s.stripeSubscriptionId);
                    return (
                      <tr
                        key={s.id}
                        className="border-b border-[--hair] transition-colors last:border-0 hover:bg-[color-mix(in_srgb,var(--brand)_3%,transparent)]"
                      >
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold text-ink">
                            {s.planLabel ?? s.className ?? "Subscription"}
                          </p>
                          {s.adminCreated && (
                            <p className="text-[0.65rem] font-medium uppercase tracking-wider text-muted">
                              Admin plan
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-ink">{s.payerName ?? "—"}</td>
                        <td className="px-4 py-3 text-sm text-muted">{s.studentName ?? "—"}</td>
                        <td className="px-4 py-3 text-sm tabular-nums text-ink">
                          {formatMoney(s.monthlyAmountCents)}
                        </td>
                        <td className="px-4 py-3 text-sm tabular-nums text-ink">
                          {formatMoney(s.amountCents)}
                          <span className="block text-xs text-muted">
                            {billingLabel(s.billingInterval)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={s.status} />
                          {s.cancelAtPeriodEnd && s.status !== "canceled" && (
                            <span className="ml-1.5 text-[0.6rem] text-amber-500">ending</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm tabular-nums text-muted">
                          {s.cancelAtPeriodEnd ? "—" : fmtDate(s.currentPeriodEnd)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {canCancel ? (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => cancel(s, false)}
                                disabled={pendingId === s.id}
                                className="text-xs text-muted transition-colors hover:text-amber-500 disabled:opacity-50"
                                title="Stop at the end of the current period"
                              >
                                {pendingId === s.id ? "…" : "Cancel at period end"}
                              </button>
                              <button
                                onClick={() => cancel(s, true)}
                                disabled={pendingId === s.id}
                                className="text-xs text-muted transition-colors hover:text-red-400 disabled:opacity-50"
                                title="Cancel immediately"
                              >
                                Now
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateSubscriptionModal
          parents={parents}
          classes={classes}
          products={products}
          onClose={() => setShowCreate(false)}
        />
      )}
    </motion.div>
  );
}
