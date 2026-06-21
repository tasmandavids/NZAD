"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import CheckoutForm from "@/components/payments/CheckoutForm";

const NZD = new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD" });

export function PayInvoiceModal({
  invoiceId,
  amountCents,
  label,
  onClose,
  onPaid,
}: {
  invoiceId: string;
  amountCents: number;
  label: string;
  onClose: () => void;
  onPaid: () => void;
}) {
  const t = useTranslations("parent.hub");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function startPayment() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/create-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("payFailed"));
        return;
      }
      setClientSecret(data.clientSecret);
    } catch {
      setError(t("payFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          className="w-full max-w-md rounded-2xl border border-[--hair] bg-surface p-6 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-lg font-black text-ink">{t("payInvoice")}</h2>
          <p className="mt-1 text-sm text-muted">{label}</p>
          <p className="mt-3 text-2xl font-black text-ink">{NZD.format(amountCents / 100)}</p>

          {!clientSecret ? (
            <button
              type="button"
              onClick={startPayment}
              disabled={loading}
              className="mt-6 w-full rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {loading ? t("preparingPayment") : t("continueToPay")}
            </button>
          ) : (
            <div className="mt-6">
              <CheckoutForm
                clientSecret={clientSecret}
                onSuccess={() => {
                  onPaid();
                  onClose();
                }}
              />
            </div>
          )}

          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

          <button type="button" onClick={onClose} className="mt-4 text-xs text-muted underline">
            {t("cancelPay")}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
