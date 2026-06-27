"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import CheckoutForm from "@/components/payments/CheckoutForm";
import { formatMoney } from "@/lib/currency";
import { createTermInstallmentIntent } from "@/app/portal/parent/billing/actions";

export function TermInstallmentPayModal({
  onClose,
  onPaid,
  invoiceIds,
  title,
  subtitle,
}: {
  onClose: () => void;
  onPaid: () => void;
  invoiceIds?: string[];
  title?: string;
  subtitle?: string;
}) {
  const t = useTranslations("parent.billing");
  const tPay = useTranslations("payments");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [installmentCents, setInstallmentCents] = useState<number | null>(null);
  const [installmentNumber, setInstallmentNumber] = useState<number | null>(null);
  const [installmentCount, setInstallmentCount] = useState<number>(3);
  const [totalCents, setTotalCents] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function startPayment() {
    setLoading(true);
    setError(null);
    try {
      const res = await createTermInstallmentIntent(invoiceIds);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setClientSecret(res.data.clientSecret);
      setInstallmentCents(res.data.installmentCents);
      setInstallmentNumber(res.data.installmentNumber);
      setInstallmentCount(res.data.installmentCount);
      setTotalCents(res.data.totalCents);
    } catch {
      setError(t("termPayFailed"));
    } finally {
      setLoading(false);
    }
  }

  const amountLabel =
    installmentCents != null ? formatMoney(installmentCents) : "—";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 8 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 8 }}
          className="w-full max-w-md overflow-hidden rounded-2xl border border-[--hair] bg-surface shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="border-b border-[--hair] px-6 py-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black tracking-tight text-ink">
                  {title ?? t("termPayTitle")}
                </h2>
                <p className="mt-0.5 text-sm text-muted">{subtitle ?? t("termPaySubtitle")}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-base hover:text-ink"
              >
                ✕
              </button>
            </div>
            {installmentNumber != null && totalCents != null && (
              <p className="mt-3 text-xs text-muted">
                {t("termInstallmentProgress", {
                  current: installmentNumber,
                  total: installmentCount,
                  accountTotal: formatMoney(totalCents),
                })}
              </p>
            )}
            <p className="mt-4 text-3xl font-black tabular-nums tracking-tight text-ink">
              {amountLabel}
            </p>
          </div>

          <div className="px-6 py-5">
            {!clientSecret ? (
              <>
                <p className="mb-4 text-sm text-muted">{t("termPayExplain")}</p>
                <button
                  type="button"
                  onClick={startPayment}
                  disabled={loading}
                  className="w-full rounded-xl py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ background: "var(--brand)" }}
                >
                  {loading ? t("preparingTermPay") : t("continueTermPay")}
                </button>
              </>
            ) : (
              <CheckoutForm
                clientSecret={clientSecret}
                submitLabel={tPay("payAmount", { amount: amountLabel })}
                onCancel={onClose}
                cancelLabel={t("cancelTermPay")}
                onSuccess={() => {
                  onPaid();
                  onClose();
                }}
              />
            )}

            {error && (
              <p className="mt-4 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-500">{error}</p>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
