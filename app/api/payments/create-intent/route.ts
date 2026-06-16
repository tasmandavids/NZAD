// ============================================================================
//  POST /api/payments/create-intent
//
//  Creates a Stripe PaymentIntent for a given invoice.
//  Also ensures the user has a Stripe Customer record.
//
//  Body: { invoiceId: string }
//  Returns: { clientSecret: string }
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { CURRENCY } from "@/lib/currency";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { invoiceId } = body as { invoiceId: string };

    if (!invoiceId) {
      return NextResponse.json({ error: "invoiceId required" }, { status: 400 });
    }

    // Fetch invoice — RLS ensures the user can only access their own invoices
    const { data: invoice, error: invErr } = await supabase
      .from("invoices")
      .select("id, amount_cents, studio_id, payer_id, stripe_payment_intent_id")
      .eq("id", invoiceId)
      .single();

    if (invErr || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Return existing intent if already created (idempotency)
    if (invoice.stripe_payment_intent_id) {
      const intent = await stripe.paymentIntents.retrieve(
        invoice.stripe_payment_intent_id as string,
      );
      if (intent.status !== "canceled") {
        return NextResponse.json({ clientSecret: intent.client_secret });
      }
    }

    // Ensure Stripe customer exists
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, stripe_customer_id")
      .eq("id", user.id)
      .single();

    let customerId = profile?.stripe_customer_id as string | undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: (profile?.full_name as string | null) ?? undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;

      // Store Stripe customer ID on profile
      await supabase
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }

    // Fetch studio for currency / descriptor
    const { data: studio } = await supabase
      .from("studios")
      .select("name")
      .eq("id", invoice.studio_id)
      .single();

    // Create PaymentIntent
    const intent = await stripe.paymentIntents.create({
      amount: invoice.amount_cents as number,
      currency: CURRENCY,
      customer: customerId,
      description: `Invoice ${invoiceId} — ${studio?.name ?? "Studio"}`,
      metadata: {
        invoice_id: invoiceId,
        studio_id: invoice.studio_id as string,
        supabase_user_id: user.id,
      },
      automatic_payment_methods: { enabled: true },
    });

    // Persist the intent ID on the invoice
    await supabase
      .from("invoices")
      .update({ stripe_payment_intent_id: intent.id })
      .eq("id", invoiceId);

    return NextResponse.json({ clientSecret: intent.client_secret });
  } catch (err) {
    console.error("[create-intent]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}
