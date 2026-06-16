// ============================================================================
//  Browser-side Stripe.js loader — singleton.
//  Returns a memoised loadStripe promise so Stripe.js is only fetched once,
//  even across multiple <CheckoutForm /> mounts.
// ============================================================================

import { loadStripe, type Stripe } from "@stripe/stripe-js";

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    // Resolve to null when unconfigured so callers can render a graceful
    // "payments unavailable" state instead of throwing during render.
    stripePromise = key ? loadStripe(key) : Promise.resolve(null);
  }
  return stripePromise;
}
