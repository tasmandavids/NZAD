"use client";

// ============================================================================
//  CheckoutForm — shared Stripe card-capture component.
// ============================================================================

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import type { StripeElementsOptions } from "@stripe/stripe-js";
import { getStripe } from "@/lib/stripe-client";
import { buildStripeAppearance } from "@/lib/stripe-appearance";

const stripePromise = getStripe();

interface CheckoutFormProps {
  clientSecret: string;
  submitLabel?: string;
  onSuccess: () => void;
  onCancel?: () => void;
  cancelLabel?: string;
}

function InnerForm({
  submitLabel,
  onSuccess,
  onCancel,
  cancelLabel,
}: Omit<CheckoutFormProps, "clientSecret">) {
  const t = useTranslations("payments");
  const tCommon = useTranslations("common");
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setBusy(true);
    setError(null);

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (confirmError) {
      setError(confirmError.message ?? t("paymentNotCompleted"));
      setBusy(false);
      return;
    }

    if (
      paymentIntent &&
      (paymentIntent.status === "succeeded" || paymentIntent.status === "processing")
    ) {
      onSuccess();
      return;
    }

    setError(t("paymentIncomplete"));
    setBusy(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="min-h-0 max-h-[min(55dvh,24rem)] overflow-y-auto overscroll-contain">
        <PaymentElement
          options={{
            layout: "accordion",
            paymentMethodOrder: ["card"],
            wallets: { applePay: "never", googlePay: "never" },
          }}
        />
      </div>

      {error && (
        <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-500">{error}</p>
      )}

      <div className={`flex shrink-0 gap-3 ${onCancel ? "" : ""}`}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 rounded-xl border border-[--hair] bg-surface py-3 text-sm font-semibold text-muted transition-colors hover:text-ink disabled:opacity-40"
          >
            {cancelLabel ?? tCommon("cancel")}
          </button>
        )}
        <button
          type="submit"
          disabled={!stripe || busy}
          className={`rounded-xl py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40 ${
            onCancel ? "flex-1" : "w-full"
          }`}
          style={{ background: "var(--brand)" }}
        >
          {busy ? t("processing") : (submitLabel ?? t("payNow"))}
        </button>
      </div>
    </form>
  );
}

export default function CheckoutForm({
  clientSecret,
  submitLabel,
  onSuccess,
  onCancel,
  cancelLabel,
}: CheckoutFormProps) {
  const appearance = useMemo(() => buildStripeAppearance(), []);

  const options: StripeElementsOptions = {
    clientSecret,
    appearance,
  };

  return (
    <Elements stripe={stripePromise} options={options} key={clientSecret}>
      <InnerForm
        submitLabel={submitLabel}
        onSuccess={onSuccess}
        onCancel={onCancel}
        cancelLabel={cancelLabel}
      />
    </Elements>
  );
}
