"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createAdminSubscription,
  type CreateAdminSubscriptionInput,
} from "@/app/portal/admin/subscriptions/actions";
import type {
  ClassOption,
  ParentOption,
  ProductOption,
} from "@/app/portal/admin/subscriptions/page";
import {
  chargeAmountCents,
  intervalLabel,
  lineTotalCents,
  monthlyAmountCents,
  type BillingInterval,
  type SubscriptionLineInput,
} from "@/lib/subscriptions/pricing";
import { formatMoney } from "@/lib/currency";

type DraftLine = SubscriptionLineInput & { key: string };

function newKey() {
  return `line-${Math.random().toString(36).slice(2, 9)}`;
}

export function CreateSubscriptionModal({
  parents,
  classes,
  products,
  onClose,
}: {
  parents: ParentOption[];
  classes: ClassOption[];
  products: ProductOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [payerId, setPayerId] = useState(parents[0]?.id ?? "");
  const [studentId, setStudentId] = useState("");
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("month");
  const [planLabel, setPlanLabel] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selectedParent = parents.find((p) => p.id === payerId);
  const students = selectedParent?.students ?? [];

  const monthlyCents = useMemo(() => monthlyAmountCents(lines), [lines]);
  const perChargeCents = useMemo(
    () => chargeAmountCents(monthlyCents, billingInterval),
    [monthlyCents, billingInterval],
  );

  const addClass = (classId: string) => {
    const cls = classes.find((c) => c.id === classId);
    if (!cls) return;
    setLines((prev) => [
      ...prev,
      {
        key: newKey(),
        itemType: "class",
        referenceId: cls.id,
        description: cls.name,
        quantity: 1,
        unitMonthlyCents: cls.priceCents,
      },
    ]);
  };

  const addProduct = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    setLines((prev) => [
      ...prev,
      {
        key: newKey(),
        itemType: "product",
        referenceId: product.id,
        description: product.name,
        quantity: 1,
        unitMonthlyCents: product.priceCents,
      },
    ]);
  };

  const addDiscount = () => {
    setLines((prev) => [
      ...prev,
      {
        key: newKey(),
        itemType: "discount",
        description: "Discount",
        quantity: 1,
        unitMonthlyCents: -1000,
      },
    ]);
  };

  const updateLine = (key: string, patch: Partial<DraftLine>) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  };

  const removeLine = (key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!payerId) return setError("Select a parent.");
    if (lines.length === 0) return setError("Add at least one class or product.");
    if (monthlyCents <= 0) return setError("Monthly total must be greater than zero.");

    const payload: CreateAdminSubscriptionInput = {
      payerId,
      studentId: studentId || undefined,
      billingInterval,
      planLabel: planLabel.trim() || undefined,
      sendToParent: true,
      lines: lines.map(({ key: _k, ...line }) => line),
    };

    startTransition(async () => {
      const res = await createAdminSubscription(payload);
      if (!res.ok) setError(res.error);
      else {
        router.refresh();
        onClose();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[--hair] bg-surface p-6 shadow-xl">
        <h2 className="text-lg font-bold text-ink">Create subscription</h2>
        <p className="mt-1 text-sm text-muted">
          Build a monthly plan from classes and products. Parents pay weekly, fortnightly, or monthly —
          a full invoice is generated on the 1st while the plan is active.
        </p>

        <form onSubmit={submit} className="mt-5 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
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
                {parents.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
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
                  <option value="">— Family plan —</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
              Payment frequency
              <select
                value={billingInterval}
                onChange={(e) => setBillingInterval(e.target.value as BillingInterval)}
                className="mt-1 w-full rounded-lg border border-[--hair] bg-base px-3 py-2 text-sm text-ink"
              >
                <option value="week">Weekly</option>
                <option value="fortnight">Fortnightly</option>
                <option value="month">Monthly</option>
              </select>
            </label>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
              Plan name <span className="font-normal normal-case">(optional)</span>
              <input
                value={planLabel}
                onChange={(e) => setPlanLabel(e.target.value)}
                placeholder="e.g. Term 2 — Emma"
                className="mt-1 w-full rounded-lg border border-[--hair] bg-base px-3 py-2 text-sm text-ink"
              />
            </label>
          </div>

          <div className="rounded-xl border border-[--hair] bg-base p-4">
            <div className="flex flex-wrap gap-2">
              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) addClass(e.target.value);
                  e.target.value = "";
                }}
                className="rounded-lg border border-[--hair] bg-surface px-3 py-1.5 text-xs font-semibold text-ink"
              >
                <option value="">+ Add class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {formatMoney(c.priceCents)}/mo
                  </option>
                ))}
              </select>
              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) addProduct(e.target.value);
                  e.target.value = "";
                }}
                className="rounded-lg border border-[--hair] bg-surface px-3 py-1.5 text-xs font-semibold text-ink"
              >
                <option value="">+ Add product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {formatMoney(p.priceCents)}/mo
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={addDiscount}
                className="rounded-lg border border-[--hair] bg-surface px-3 py-1.5 text-xs font-semibold text-ink"
              >
                + Add discount
              </button>
            </div>

            {lines.length === 0 ? (
              <p className="mt-4 text-sm text-muted">Add classes or products to build the monthly plan.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {lines.map((line) => (
                  <li
                    key={line.key}
                    className="flex flex-wrap items-center gap-2 rounded-lg border border-[--hair] bg-surface px-3 py-2"
                  >
                    <span className="text-[0.65rem] font-bold uppercase tracking-wider text-muted">
                      {line.itemType}
                    </span>
                    <input
                      value={line.description}
                      onChange={(e) => updateLine(line.key, { description: e.target.value })}
                      className="min-w-[8rem] flex-1 rounded border border-[--hair] bg-base px-2 py-1 text-sm"
                    />
                    <input
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(e) =>
                        updateLine(line.key, { quantity: Math.max(1, Number(e.target.value) || 1) })
                      }
                      className="w-16 rounded border border-[--hair] bg-base px-2 py-1 text-sm"
                    />
                    <span className="text-xs text-muted">×</span>
                    <input
                      type="number"
                      step="0.01"
                      value={(line.unitMonthlyCents / 100).toFixed(2)}
                      onChange={(e) =>
                        updateLine(line.key, {
                          unitMonthlyCents: Math.round(Number.parseFloat(e.target.value || "0") * 100),
                        })
                      }
                      className="w-24 rounded border border-[--hair] bg-base px-2 py-1 text-sm"
                    />
                    <span className="text-sm font-semibold tabular-nums">
                      {formatMoney(lineTotalCents(line))}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeLine(line.key)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-[--hair] bg-base px-4 py-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Monthly plan total</span>
              <span className="font-bold tabular-nums">{formatMoney(monthlyCents)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-muted">{intervalLabel(billingInterval)} charge</span>
              <span className="font-semibold tabular-nums">{formatMoney(perChargeCents)}</span>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[--hair] px-4 py-2 text-sm font-semibold text-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending || parents.length === 0}
              className="rounded-xl bg-ink px-4 py-2 text-sm font-bold text-paper disabled:opacity-50"
            >
              {pending ? "Creating…" : "Create & send to parent"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
