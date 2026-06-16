"use server";

// ============================================================================
//  Admin · Subscriptions server actions
//  Admin-side cancellation of auto-pay subscriptions (Phase 3.2 management).
// ============================================================================

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

async function getAdminStudio() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in.", supabase, studioId: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("studio_id, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return { error: "Admin only.", supabase, studioId: null };
  if (!profile.studio_id) return { error: "No studio found.", supabase, studioId: null };

  return { error: null, supabase, studioId: profile.studio_id as string };
}

/**
 * Cancel an auto-pay subscription. `immediate` cancels now; otherwise it stops
 * at the end of the current period. Studio-scoped via RLS + an explicit check.
 */
export async function adminCancelSubscription(
  stripeSubscriptionId: string,
  immediate = false,
): Promise<ActionResult> {
  const { error, supabase, studioId } = await getAdminStudio();
  if (error || !studioId) return { ok: false, error: error ?? "Unknown" };

  const { data: row } = await supabase
    .from("subscriptions")
    .select("id, studio_id, stripe_subscription_id")
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .single();
  if (!row || row.studio_id !== studioId) {
    return { ok: false, error: "Subscription not found." };
  }

  const { stripe } = await import("@/lib/stripe");
  try {
    if (immediate) {
      await stripe.subscriptions.cancel(stripeSubscriptionId);
    } else {
      await stripe.subscriptions.update(stripeSubscriptionId, { cancel_at_period_end: true });
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Stripe error" };
  }

  // The customer.subscription.* webhook will reconcile status; reflect the
  // intent immediately for snappy UI.
  await supabase
    .from("subscriptions")
    .update(
      immediate
        ? { status: "canceled", cancel_at_period_end: false }
        : { cancel_at_period_end: true },
    )
    .eq("stripe_subscription_id", stripeSubscriptionId);

  revalidatePath("/portal/admin/subscriptions");
  return { ok: true };
}
