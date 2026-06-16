"use client";

// ============================================================================
//  AutoPaySetup — parent-facing monthly auto-pay (Phase 3.2)
//  Lists the family's paid enrolled classes. For each, the parent can start a
//  recurring monthly Stripe subscription (card captured via <CheckoutForm>) or,
//  if already on auto-pay, cancel it at period end.
// ============================================================================

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  createEnrollmentSubscription,
  cancelSubscription,
} from "@/app/portal/parent/subscriptions/actions";
import CheckoutForm from "@/components/payments/CheckoutForm";

export type AutoPayItem = {
  studentId: string;
  studentName: string | null;
  classId: string;
  className: string;
  priceCents: number;
  subscriptionId: string | null; // non-null when auto-pay is already active
  status: string | null;
  cancelAtPeriodEnd: boolean;
};

const money = (cents: number) =>
  new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD" }).format(cents / 100);

function itemKey(i: AutoPayItem) {
  return `${i.studentId}:${i.classId}`;
}

export default function AutoPaySetup({ items }: { items: AutoPayItem[] }) {
  // Local UI state per item: which one is mid-setup, its clientSecret, and any
  // items the parent just confirmed / cancelled this session.
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());
  const [cancelled, setCancelled] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function startSetup(item: AutoPayItem) {
    setError(null);
    setActiveKey(itemKey(item));
    setClientSecret(null);
    startTransition(async () => {
      const res = await createEnrollmentSubscription(
        item.studentId,
        item.classId,
        item.className,
        item.priceCents,
      );
      if (!res.ok) {
        setError(res.error);
        setActiveKey(null);
        return;
      }
      setClientSecret(res.data.clientSecret);
    });
  }

  function cancel(item: AutoPayItem) {
    if (!item.subscriptionId) return;
    setError(null);
    startTransition(async () => {
      const res = await cancelSubscription(item.subscriptionId!);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setCancelled((prev) => new Set(prev).add(itemKey(item)));
    });
  }

  return (
    <section>
      <h2 className="text-xl font-black text-ink">Auto-pay</h2>
      <p className="mb-4 text-sm text-muted">
        Set up monthly tuition so fees are charged automatically — no more chasing invoices.
      </p>

      {error && (
        <p className="mb-3 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-500">{error}</p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const key = itemKey(item);
          const isActive = (item.subscriptionId && !cancelled.has(key)) || confirmed.has(key);
          const isCancelling = cancelled.has(key);

          return (
            <div
              key={key}
              className="rounded-2xl border border-[--hair] bg-surface p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink">{item.className}</p>
                  <p className="text-xs text-muted">
                    {item.studentName ?? "Student"} · {money(item.priceCents)}/month
                  </p>
                </div>
                {isActive && !isCancelling && (
                  <span className="rounded-full bg-green-500/15 px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-wider text-green-500">
                    Auto-pay on
                  </span>
                )}
                {isCancelling && (
                  <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-wider text-amber-500">
                    Ending
                  </span>
                )}
              </div>

              <div className="mt-3">
                {isCancelling ? (
                  <p className="text-xs text-muted">
                    Auto-pay will stop at the end of the current period.
                  </p>
                ) : isActive ? (
                  <button
                    onClick={() => cancel(item)}
                    disabled={pending || !item.subscriptionId}
                    className="text-xs font-semibold text-muted transition-colors hover:text-red-400 disabled:opacity-40"
                  >
                    Cancel auto-pay
                  </button>
                ) : (
                  <button
                    onClick={() => startSetup(item)}
                    disabled={pending && activeKey === key}
                    className="rounded-xl px-3 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    style={{ background: "var(--brand)" }}
                  >
                    {pending && activeKey === key ? "Starting…" : "Set up monthly auto-pay"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Card-capture modal for the first subscription invoice */}
      <AnimatePresence>
        {activeKey && clientSecret && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setActiveKey(null);
                setClientSecret(null);
              }}
            />
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
            >
              <div className="w-full max-w-md rounded-2xl border border-[--hair] bg-surface p-6 shadow-2xl">
                <h3 className="mb-1 font-black text-ink">Confirm auto-pay</h3>
                <p className="mb-4 text-sm text-muted">
                  Your card is saved and charged monthly. Cancel any time.
                </p>
                <CheckoutForm
                  clientSecret={clientSecret}
                  submitLabel="Start auto-pay"
                  cancelLabel="Not now"
                  onCancel={() => {
                    setActiveKey(null);
                    setClientSecret(null);
                  }}
                  onSuccess={() => {
                    setConfirmed((prev) => new Set(prev).add(activeKey));
                    setActiveKey(null);
                    setClientSecret(null);
                  }}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </section>
  );
}
