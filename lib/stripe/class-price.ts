import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { CURRENCY } from "@/lib/currency";

/** Mint or reuse a monthly Stripe Price for a class (service-role — bypasses parent UPDATE on classes). */
export async function getOrCreateClassStripePrice(
  classId: string,
  studioId: string,
  className: string,
  priceCents: number,
): Promise<string> {
  const supabase = createAdminClient();

  const { data: cls } = await supabase
    .from("classes")
    .select("stripe_product_id, stripe_price_id, stripe_price_cents, studio_id")
    .eq("id", classId)
    .single();

  if (!cls || cls.studio_id !== studioId) {
    throw new Error("Class not found.");
  }

  let productId = (cls.stripe_product_id as string | null) ?? null;
  let priceId = (cls.stripe_price_id as string | null) ?? null;
  const cachedCents = cls.stripe_price_cents as number | null;

  if (!productId) {
    const product = await stripe.products.create({
      name: `Tuition — ${className}`,
      metadata: { studio_id: studioId, class_id: classId },
    });
    productId = product.id;
    await supabase.from("classes").update({ stripe_product_id: productId }).eq("id", classId);
  }

  if (!priceId || cachedCents !== priceCents) {
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
        console.warn(`[class-price] could not archive old price ${previousPriceId}:`, e);
      }
    }
  }

  return priceId;
}
