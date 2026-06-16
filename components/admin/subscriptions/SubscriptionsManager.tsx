"use client";

// ============================================================================
//  SubscriptionsManager — admin oversight of auto-pay subscriptions.
//  Pre-fetched rows in; cancellation goes through the adminCancelSubscription
//  server action. Active MRR summary + status filter.
// ============================================================================

import { useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { adminCancelSubscription } from "@/app/portal/admin/subscriptions/actions";
import type { SubscriptionRow } from "@/app/portal/admin/subscriptions/page";
import { formatMoney } from "@/lib/currency";

const STATUS_STYLES: Record<string, string> = {
  active:     "bg-green-500/15 text-green-500",
  trialing:   "bg-blue-500/15 text-blue-500",
  past_due:   "bg-amber-500/15 text-amber-500",
  unpaid:     "bg-amber-500/15 text-amber-500",
  incomplete: "bg-muted/15 text-muted",
  canceled:   "bg-red-500/15 text-red-400",
};

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? "bg-muted/15 text-muted";
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider ${style}`}>
      {status.replace("_", " ")}
    </span>
  );
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" });
}

export default function SubscriptionsManager({
  subscriptions,
}: {
  subscriptions: SubscriptionRow[];
}) {
  const [filter, setFilter] = useState<"all" | "active" | "canceled">("all");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const activeMrrCents = useMemo(
    () =>
      subscriptions
        .filter((s) => s.status === "active" && s.interval === "month")
        .reduce((sum, s) => sum + s.amountCents, 0),
    [subscriptions],
  );
  const activeCount = subscriptions.filter((s) => s.status === "active").length;

  const filtered = subscriptions.filter((s) => {
    if (filter === "active") return s.status === "active";
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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-ink">Subscriptions</h1>
        <p className="text-sm text-muted">Auto-pay tuition plans across your studio</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[--hair] bg-surface p-4">
          <p className="text-[0.62rem] font-semibold uppercase tracking-wider text-muted">Active plans</p>
          <p className="mt-1 text-2xl font-black text-ink tabular-nums">{activeCount}</p>
        </div>
        <div className="rounded-2xl border border-[--hair] bg-surface p-4">
          <p className="text-[0.62rem] font-semibold uppercase tracking-wider text-muted">Monthly recurring</p>
          <p className="mt-1 text-2xl font-black text-ink tabular-nums">{formatMoney(activeMrrCents)}</p>
        </div>
        <div className="rounded-2xl border border-[--hair] bg-surface p-4">
          <p className="text-[0.62rem] font-semibold uppercase tracking-wider text-muted">Total</p>
          <p className="mt-1 text-2xl font-black text-ink tabular-nums">{subscriptions.length}</p>
        </div>
      </div>

      {/* Filter */}
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

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-[--hair] bg-surface">
        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-muted">No subscriptions to show.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="border-b border-[--hair]">
                  {["Plan", "Payer", "Student", "Amount", "Status", "Next charge", ""].map((h) => (
                    <th
                      key={h}
                      className={`px-4 py-3 text-[0.62rem] font-semibold uppercase tracking-wider text-muted ${
                        !h ? "text-right" : ""
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {filtered.map((s) => {
                    const canCancel =
                      s.status !== "canceled" && !s.cancelAtPeriodEnd && Boolean(s.stripeSubscriptionId);
                    return (
                      <tr
                        key={s.id}
                        className="border-b border-[--hair] last:border-0 hover:bg-[color-mix(in_srgb,var(--brand)_3%,transparent)] transition-colors"
                      >
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold text-ink">
                            {s.planLabel ?? s.className ?? "Subscription"}
                          </p>
                          <p className="text-xs text-muted">per {s.interval}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-ink">{s.payerName ?? "—"}</td>
                        <td className="px-4 py-3 text-sm text-muted">{s.studentName ?? "—"}</td>
                        <td className="px-4 py-3 text-sm tabular-nums text-ink">
                          {formatMoney(s.amountCents)}
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
                                className="text-xs text-muted hover:text-amber-500 transition-colors disabled:opacity-50"
                                title="Stop at the end of the current period"
                              >
                                {pendingId === s.id ? "…" : "Cancel at period end"}
                              </button>
                              <button
                                onClick={() => cancel(s, true)}
                                disabled={pendingId === s.id}
                                className="text-xs text-muted hover:text-red-400 transition-colors disabled:opacity-50"
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
    </motion.div>
  );
}
