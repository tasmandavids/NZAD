import { describe, it, expect, beforeAll } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { integrationEnabled, integrationSkipReason } from "./helpers/env";
import { missingTables, migrationsHint } from "./helpers/schema";

const run = integrationEnabled();

describe.skipIf(!run)("order refund restock (0023 trigger)", () => {
  let skipReason = integrationSkipReason();
  let studioId: string | null = null;
  let userId: string | null = null;
  let productId: string | null = null;
  let orderId: string | null = null;
  const initialStock = 10;
  const orderQty = 2;

  beforeAll(async () => {
    if (!run) return;

    const supabase = createAdminClient();
    const missing = await missingTables(supabase);
    const orderTables = ["orders", "order_items", "products"] as const;
    const needed = missing.filter((t): t is (typeof orderTables)[number] =>
      (orderTables as readonly string[]).includes(t),
    );
    if (needed.length > 0) {
      skipReason = migrationsHint(needed);
      return;
    }

    const { data: studio } = await supabase.from("studios").select("id").limit(1).single();
    const { data: user } = await supabase.from("profiles").select("id").limit(1).single();
    if (!studio || !user) {
      skipReason = "Need at least one studio and profile for order restock test.";
      return;
    }
    studioId = studio.id;
    userId = user.id;

    const { data: product, error: productErr } = await supabase
      .from("products")
      .insert({
        studio_id: studioId,
        name: "Integration Test Tee",
        price_cents: 1000,
        stock_qty: initialStock,
        active: true,
      })
      .select("id")
      .single();

    if (productErr || !product) {
      skipReason = productErr?.message ?? "Could not create product";
      return;
    }
    productId = product.id;

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        studio_id: studioId,
        user_id: userId,
        total_cents: 2000,
        status: "pending",
      })
      .select("id")
      .single();

    if (orderErr || !order) {
      skipReason = orderErr?.message ?? "Could not create order";
      return;
    }
    orderId = order.id;

    await supabase.from("order_items").insert({
      order_id: orderId,
      product_id: productId,
      qty: orderQty,
      unit_price: 1000,
    });
  });

  it("restores stock when a paid order is refunded", async () => {
    if (skipReason) {
      console.warn(`SKIP: ${skipReason}`);
      return;
    }

    const supabase = createAdminClient();

    const { error: payErr } = await supabase
      .from("orders")
      .update({ status: "paid" })
      .eq("id", orderId!);
    expect(payErr).toBeNull();

    const { data: afterPay } = await supabase
      .from("products")
      .select("stock_qty")
      .eq("id", productId!)
      .single();
    expect(afterPay?.stock_qty).toBe(initialStock - orderQty);

    const { error: refundErr } = await supabase
      .from("orders")
      .update({ status: "refunded", refund_amount_cents: 2000 })
      .eq("id", orderId!);
    expect(refundErr).toBeNull();

    const { data: afterRefund } = await supabase
      .from("products")
      .select("stock_qty")
      .eq("id", productId!)
      .single();
    expect(afterRefund?.stock_qty).toBe(initialStock);

    await supabase.from("orders").delete().eq("id", orderId!);
    await supabase.from("products").delete().eq("id", productId!);
  });
});
