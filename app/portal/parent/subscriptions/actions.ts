"use server";

// ============================================================================
//  Parent auto-pay subscription server actions (Phase 3.2)
//  Creates a recurring monthly Stripe Subscription for an enrolled class and
//  mirrors it into public.subscriptions. The customer.subscription.* webhooks
//  keep the row's status / period in sync after creation.
// ============================================================================

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CURRENCY } from "@/lib/currency";
import { siblingDiscountInfo } from "@/lib/discounts";
import type Stripe from "stripe";

export type ActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function getParentContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in.", supabase, userId: null, studioId: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("studio_id, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "parent" && profile?.role !== "admin") {
    return { error: "Parent access required.", supabase, userId: null, studioId: null };
  }

  return { error: null, supabase, userId: user.id, studioId: profile.studio_id as string };
}

// Robustly pull a PaymentElement client secret from a freshly-created
// default_incomplete subscription's latest invoice — tolerant of the
// confirmation_secret (2025+) and legacy payment_intent invoice shapes.
function clientSecretFromSubscription(sub: Stripe.Subscription): string | null {
  const invoice = sub.latest_invoice;
  if (!invoice || typeof invoice === "string") return null;

  const inv = invoice as Stripe.Invoice & {
    confirmation_secret?: { client_secret?: string | null } | null;
    payment_intent?: string | Stripe.PaymentIntent | null;
  };

  if (inv.confirmation_secret?.client_secret) return inv.confirmation_secret.client_secret;
  if (inv.payment_intent && typeof inv.payment_intent !== "string") {
    return inv.payment_intent.client_secret ?? null;
  }
  return null;
}

function periodEndFromSubscription(sub: Stripe.Subscription): string | null {
  const s = sub as Stripe.Subscription & { current_period_end?: number | null };
  const epoch =
    s.current_period_end ??
    (sub.items?.data?.[0] as { current_period_end?: number } | undefined)?.current_period_end ??
    null;
  return epoch ? new Date(epoch * 1000).toISOString() : null;
}

type SupaClient = Awaited<ReturnType<typeof createClient>>;

// Return a reusable monthly Stripe Price id for this class, creating the
// Product and/or Price on demand and caching their ids on the classes row.
// Stripe Prices are immutable, so if the class's tuition has changed since the
// cached Price was minted, we create a fresh Price and update the cache.
async function getOrCreateClassPrice(
  stripe: Stripe,
  supabase: SupaClient,
  classId: string,
  studioId: string,
  className: string,
  priceCents: number,
): Promise<string> {
  const { data: cls } = await supabase
    .from("classes")
    .select("stripe_product_id, stripe_price_id, stripe_price_cents")
    .eq("id", classId)
    .single();

  let productId = (cls?.stripe_product_id as string | null) ?? null;
  let priceId = (cls?.stripe_price_id as string | null) ?? null;
  const cachedCents = cls?.stripe_price_cents as number | null;

  if (!productId) {
    const product = await stripe.products.create({
      name: `Tuition — ${className}`,
      metadata: { studio_id: studioId, class_id: classId },
    });
    productId = product.id;
    await supabase.from("classes").update({ stripe_product_id: productId }).eq("id", classId);
  }

  if (!priceId || cachedCents !== priceCents) {
    // Stripe Prices are immutable. When tuition changes we mint a fresh Price
    // and ARCHIVE the previous one so it doesn't linger as an active, orphaned
    // Price. Existing subscriptions already reference the old Price object and
    // keep billing correctly even after it's deactivated.
    const previousPriceId = priceId;

    const price = await stripe.prices.create({
      product: productId,
      currency: CURRENCY,
      unit_amount: priceCents,
      recurring: { interval: "month" },
      metadata: { studio_id: studioId, class_id: classId },
    });
    priceId = price.id;
    await supabase
      .from("classes")
      .update({ stripe_price_id: priceId, stripe_price_cents: priceCents })
      .eq("id", classId);

    if (previousPriceId && previousPriceId !== priceId) {
      try {
        await stripe.prices.update(previousPriceId, { active: false });
      } catch (e) {
        // Non-fatal: a stale active Price is harmless; just log it.
        console.warn(`[subscriptions] could not archive old price ${previousPriceId}:`, e);
      }
    }
  }

  return priceId;
}

// Return a reusable forever percent-off coupon id for the given whole-number
// percentage, creating it on first use. Stable id so we don't accumulate
// duplicate coupons across families/charges.
async function getOrCreatePercentCoupon(stripe: Stripe, pct: number): Promise<string> {
  const id = `olune-sibling-${pct}pct`;
  try {
    await stripe.coupons.retrieve(id);
    return id;
  } catch {
    const coupon = await stripe.coupons.create({
      id,
      percent_off: pct,
      duration: "forever",
      name: `Sibling discount ${pct}%`,
    });
    return coupon.id;
  }
}

export async function createEnrollmentSubscription(
  studentId: string,
  classId: string,
  className: string,
  priceCents: number,
): Promise<ActionResult<{ clientSecret: string; subscriptionId: string }>> {
  const { error, supabase, userId, studioId } = await getParentContext();
  if (error || !userId || !studioId) return { ok: false, error: error ?? "Unknown" };
  if (priceCents <= 0) return { ok: false, error: "Class has no recurring fee." };

  // Verify guardian relationship.
  const { data: guardianship } = await supabase
    .from("guardianships")
    .select("guardian_id")
    .eq("guardian_id", userId)
    .eq("student_id", studentId)
    .single();
  if (!guardianship) return { ok: false, error: "You are not a guardian of this student." };

  // Resolve / create the Stripe customer.
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id, full_name")
    .eq("id", userId)
    .single();

  const { stripe } = await import("@/lib/stripe");

  let customerId = profile?.stripe_customer_id as string | null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: profile?.full_name || undefined,
      metadata: { supabase_user_id: userId, studio_id: studioId },
    });
    customerId = customer.id;
    await supabase.from("profiles").update({ stripe_customer_id: customerId }).eq("id", userId);
  }

  // Sibling / family discount (Phase 3.3) — applied to recurring auto-pay too.
  // Reusable per-class Prices are immutable, so the family discount is applied
  // via a Stripe coupon rather than by changing the Price.
  const discount = await siblingDiscountInfo(supabase, studioId, userId, studentId, priceCents);

  // Create the recurring subscription against a REUSABLE Stripe Price for this
  // class (one Product + Price per class, cached on the classes row) instead of
  // minting a throwaway Product on every subscription.
  let sub: Stripe.Subscription;
  try {
    const priceId = await getOrCreateClassPrice(
      stripe,
      supabase,
      classId,
      studioId,
      className,
      priceCents,
    );

    const couponId = discount.applies
      ? await getOrCreatePercentCoupon(stripe, discount.pct)
      : null;

    sub = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      ...(couponId ? { discounts: [{ coupon: couponId }] } : {}),
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.confirmation_secret"],
      metadata: {
        studio_id: studioId,
        supabase_user_id: userId,
        student_id: studentId,
        class_id: classId,
      },
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Stripe error" };
  }

  const clientSecret = clientSecretFromSubscription(sub);
  if (!clientSecret) {
    return { ok: false, error: "Stripe did not return a client secret for the first invoice." };
  }

  // Mirror into our subscriptions table (status synced later by webhook).
  await supabase.from("subscriptions").insert({
    studio_id:              studioId,
    payer_id:               userId,
    student_id:             studentId,
    class_id:               classId,
    stripe_subscription_id: sub.id,
    stripe_customer_id:     customerId,
    plan_label:             discount.applies
                              ? `${className} — monthly (${discount.pct}% sibling discount)`
                              : `${className} — monthly`,
    amount_cents:           discount.discountedCents,
    currency: CURRENCY,
    interval:               "month",
    status:                 sub.status,
    current_period_end:     periodEndFromSubscription(sub),
    cancel_at_period_end:   sub.cancel_at_period_end ?? false,
  });

  revalidatePath("/portal/parent");
  return { ok: true, data: { clientSecret, subscriptionId: sub.id } };
}

// Cancel auto-pay at period end (parent-initiated).
export async function cancelSubscription(subscriptionId: string): Promise<ActionResult> {
  const { error, supabase, userId } = await getParentContext();
  if (error || !userId) return { ok: false, error: error ?? "Unknown" };

  // Ensure the caller owns this subscription.
  const { data: row } = await supabase
    .from("subscriptions")
    .select("id, stripe_subscription_id, payer_id")
    .eq("stripe_subscription_id", subscriptionId)
    .single();
  if (!row || row.payer_id !== userId) {
    return { ok: false, error: "Subscription not found." };
  }

  const { stripe } = await import("@/lib/stripe");
  try {
    await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Stripe error" };
  }

  await supabase
    .from("subscriptions")
    .update({ cancel_at_period_end: true })
    .eq("stripe_subscription_id", subscriptionId);

  revalidatePath("/portal/parent");
  return { ok: true, data: null };
}
