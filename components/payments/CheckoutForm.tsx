"use client";

// ============================================================================
//  CheckoutForm — shared Stripe card-capture component.
//
//  Wraps the Stripe <Elements> provider around a <PaymentElement> and a submit
//  button. Given a PaymentIntent `clientSecret` (created server-side), it
//  collects card details and calls confirmPayment with redirect:"if_required",
//  so the flow stays inline for card payments and only redirects when the
//  payment method demands it (e.g. some 3-D Secure / bank redirects).
//
//  On success the parent's onSuccess() fires — the relevant Stripe webhook
//  (payment_intent.succeeded) is what actually finalises the order / ticket /
//  invoice server-side, so onSuccess should only drive UI confirmation.
//
//  Usage:
//    <CheckoutForm
//      clientSecret={clientSecret}
//      submitLabel="Pay $40.00"
//      onSuccess={() => goToConfirmation()}
//    />
// ============================================================================

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import type { StripeElementsOptions } from "@stripe/stripe-js";
import { getStripe } from "@/lib/stripe-client";

const stripePromise = getStripe();

interface CheckoutFormProps {
  /** PaymentIntent client secret returned by the create-intent endpoint. */
  clientSecret: string;
  /** Label for the pay button (e.g. "Pay $40.00"). */
  submitLabel?: string;
  /** Fired after the payment is confirmed (status succeeded / processing). */
  onSuccess: () => void;
  /** Optional cancel / back affordance. */
  onCancel?: () => void;
  cancelLabel?: string;
}

// ─── Inner form (must live inside <Elements>) ────────────────────────────────

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

    // Elements was created with a clientSecret (PaymentIntent-first flow), so we
    // confirm directly — confirmPayment validates the fields and surfaces errors.
    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      // Stay inline unless the payment method requires a redirect.
      redirect: "if_required",
    });

    if (confirmError) {
      setError(confirmError.message ?? t("paymentNotCompleted"));
      setBusy(false);
      return;
    }

    if (
      paymentIntent &&
      (paymentIntent.status === "succeeded" ||
        paymentIntent.status === "processing")
    ) {
      onSuccess();
      return;
    }

    // requires_action / requires_payment_method etc.
    setError(t("paymentIncomplete"));
    setBusy(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <PaymentElement options={{ layout: "tabs" }} />

      {error && (
        <p className="rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-500">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 rounded-xl border border-[--hair] py-3 text-sm font-semibold text-muted transition-colors hover:border-[--brand] hover:text-ink disabled:opacity-40"
          >
            {cancelLabel ?? tCommon("back")}
          </button>
        )}
        <button
          type="submit"
          disabled={!stripe || busy}
          className="flex-1 rounded-xl bg-brand py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          style={{ background: "var(--brand)" }}
        >
          {busy ? t("processing") : (submitLabel ?? t("payNow"))}
        </button>
      </div>
    </form>
  );
}

// ─── Public wrapper ──────────────────────────────────────────────────────────

export default function CheckoutForm({
  clientSecret,
  submitLabel,
  onSuccess,
  onCancel,
  cancelLabel,
}: CheckoutFormProps) {
  const options: StripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: "stripe",
      variables: {
        colorPrimary: "#000000",
        borderRadius: "12px",
        fontFamily: "inherit",
      },
    },
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <InnerForm
        submitLabel={submitLabel}
        onSuccess={onSuccess}
        onCancel={onCancel}
        cancelLabel={cancelLabel}
      />
    </Elements>
  );
}
