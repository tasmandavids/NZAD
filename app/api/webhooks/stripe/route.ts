// ============================================================================
//  POST /api/webhooks/stripe
//
//  Receives Stripe webhook events and syncs state to Supabase.
//  Handled events:
//    • payment_intent.succeeded   → mark invoice/order/ticket paid, record payment
//    • invoice.paid               → finalise an existing invoice, OR (for
//                                   subscription auto-pay charges) mirror a new
//                                   per-charge invoices + payments row
//    • invoice.payment_failed     → mark overdue + payment_failed notification
//    • customer.subscription.*    → sync the subscriptions row status/period
//
//  Requires env: STRIPE_WEBHOOK_SECRET
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CURRENCY, gstComponentCents } from "@/lib/currency";
import type Stripe from "stripe";

// Webhooks run anonymously, so we need a client that bypasses RLS. Prefer the
// service-role client (SUPABASE_SERVICE_ROLE_KEY); fall back to the anon-keyed
// server client in local dev where the service key may not be set.
async function getServiceSupabase() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) return createAdminClient();
  return createClient();
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("STRIPE_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[stripe-webhook] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = await getServiceSupabase();

  // ── Idempotency ledger (migration 0020) ──────────────────────────────────
  // Stripe retries on non-2xx and can deliver the same event more than once.
  // Record the event.id first; if it's already present, this is a replay — ack
  // with 200 and do no further work. A failed insert (e.g. table missing in a
  // not-yet-migrated env) is non-fatal: we fall through and process the event.
  const { error: ledgerError } = await supabase
    .from("stripe_events")
    .insert({ id: event.id, type: event.type });

  if (ledgerError) {
    // Unique-violation → we've already handled this event. Anything else
    // (table absent, transient) is logged and we continue processing.
    if (ledgerError.code === "23505") {
      console.log(`[stripe-webhook] duplicate event ${event.id} ignored`);
      return NextResponse.json({ received: true, duplicate: true });
    }
    console.warn(`[stripe-webhook] ledger insert failed (continuing):`, ledgerError.message);
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const intent = event.data.object as Stripe.PaymentIntent;
        const meta = intent.metadata ?? {};
        const invoiceId = meta.invoice_id;
        const orderId = meta.order_id;
        const eventId = meta.event_id;

        // ── Invoice payment ────────────────────────────────────────────────
        if (invoiceId) {
          await supabase
            .from("invoices")
            .update({
              status: "paid",
              paid_at: new Date().toISOString(),
              stripe_payment_intent_id: intent.id,
            })
            .eq("id", invoiceId);

          await supabase.from("payments").insert({
            studio_id: meta.studio_id,
            payer_id: meta.supabase_user_id ?? meta.user_id ?? null,
            invoice_id: invoiceId,
            amount_cents: intent.amount_received,
            currency: intent.currency,
            stripe_payment_intent_id: intent.id,
            status: "succeeded",
            description: intent.description,
          });

          console.log(`[stripe-webhook] payment_intent.succeeded — invoice ${invoiceId} marked paid`);
          break;
        }

        // ── Shop order payment ─────────────────────────────────────────────
        // Setting status='paid' fires the stock-decrement DB trigger.
        if (orderId) {
          await supabase
            .from("orders")
            .update({
              status: "paid",
              stripe_payment_intent_id: intent.id,
            })
            .eq("id", orderId);

          console.log(`[stripe-webhook] payment_intent.succeeded — order ${orderId} marked paid`);
          break;
        }

        // ── Event ticket payment ───────────────────────────────────────────
        // Promote the reserved ticket to 'paid'; the sync trigger keeps
        // events.sold_tickets accurate.
        if (eventId) {
          const userId = meta.user_id ?? null;
          let q = supabase
            .from("event_tickets")
            .update({ status: "paid" })
            .eq("event_id", eventId)
            .eq("stripe_payment_intent_id", intent.id);
          if (userId) q = q.eq("user_id", userId);
          await q;

          console.log(`[stripe-webhook] payment_intent.succeeded — event ticket (${eventId}) marked paid`);
          break;
        }

        console.log("[stripe-webhook] payment_intent.succeeded — no matching metadata, ignored");
        break;
      }

      case "invoice.paid": {
        const stripeInvoice = event.data.object as Stripe.Invoice & {
          subscription?: string | Stripe.Subscription | null;
          payment_intent?: string | Stripe.PaymentIntent | null;
        };
        const stripeInvoiceId = stripeInvoice.id;

        // 1. Try to finalise an existing invoices row (one-off Billing flow).
        const { data: updated } = await supabase
          .from("invoices")
          .update({
            status: "paid",
            paid_at: new Date().toISOString(),
            stripe_invoice_id: stripeInvoiceId,
          })
          .eq("stripe_invoice_id", stripeInvoiceId)
          .select("id");

        if (updated && updated.length) {
          console.log(`[stripe-webhook] invoice.paid — updated existing invoice ${stripeInvoiceId}`);
          break;
        }

        // 2. Recurring auto-pay charge → mirror a per-charge invoices + payments
        //    row so billing/revenue reporting includes subscription income.
        const subId =
          typeof stripeInvoice.subscription === "string"
            ? stripeInvoice.subscription
            : stripeInvoice.subscription?.id ?? null;

        if (!subId) {
          console.log(`[stripe-webhook] invoice.paid — ${stripeInvoiceId} (no subscription, ignored)`);
          break;
        }

        // Idempotency: skip if we've already mirrored this Stripe invoice.
        const { data: existing } = await supabase
          .from("invoices")
          .select("id")
          .eq("stripe_invoice_id", stripeInvoiceId)
          .limit(1);
        if (existing && existing.length) {
          console.log(`[stripe-webhook] invoice.paid — ${stripeInvoiceId} already mirrored`);
          break;
        }

        const { data: subRow } = await supabase
          .from("subscriptions")
          .select("studio_id, payer_id, student_id, plan_label")
          .eq("stripe_subscription_id", subId)
          .single();

        if (!subRow) {
          console.log(`[stripe-webhook] invoice.paid — no subscription row for ${subId}, skipped`);
          break;
        }

        const amount = stripeInvoice.amount_paid ?? stripeInvoice.total ?? 0;
        const piId =
          typeof stripeInvoice.payment_intent === "string"
            ? stripeInvoice.payment_intent
            : stripeInvoice.payment_intent?.id ?? null;

        const { data: newInvoice } = await supabase
          .from("invoices")
          .insert({
            studio_id: subRow.studio_id,
            payer_id: subRow.payer_id,
            student_id: subRow.student_id,
            amount_cents: amount,
            gst_cents: gstComponentCents(amount),
            status: "paid",
            stripe_invoice_id: stripeInvoiceId,
            stripe_payment_intent_id: piId,
            paid_at: new Date().toISOString(),
            issued_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        await supabase.from("payments").insert({
          studio_id: subRow.studio_id,
          payer_id: subRow.payer_id,
          invoice_id: newInvoice?.id ?? null,
          amount_cents: amount,
          currency: stripeInvoice.currency ?? CURRENCY,
          stripe_payment_intent_id: piId,
          status: "succeeded",
          description: subRow.plan_label
            ? `Auto-pay — ${subRow.plan_label}`
            : "Auto-pay subscription charge",
        });

        console.log(`[stripe-webhook] invoice.paid — mirrored subscription charge ${stripeInvoiceId}`);
        break;
      }

      case "invoice.payment_failed": {
        // Phase 4.3 — payment_failed notification + mark our invoice overdue.
        const stripeInvoice = event.data.object as Stripe.Invoice & {
          subscription?: string | Stripe.Subscription | null;
        };

        // If this maps to one of our invoice rows, flag it overdue (the 0008
        // trigger already emits an invoice_overdue notification on that change).
        if (stripeInvoice.id) {
          await supabase
            .from("invoices")
            .update({ status: "overdue" })
            .eq("stripe_invoice_id", stripeInvoice.id)
            .neq("status", "paid");
        }

        // Resolve who to notify. Subscription invoices won't match an invoices
        // row, so fall back to the subscriptions table by Stripe subscription id.
        let studioId: string | null = null;
        let userId: string | null = null;

        const subId =
          typeof stripeInvoice.subscription === "string"
            ? stripeInvoice.subscription
            : stripeInvoice.subscription?.id ?? null;

        if (subId) {
          const { data: subRow } = await supabase
            .from("subscriptions")
            .select("studio_id, payer_id")
            .eq("stripe_subscription_id", subId)
            .single();
          studioId = subRow?.studio_id ?? null;
          userId = subRow?.payer_id ?? null;
        }

        if ((!studioId || !userId) && stripeInvoice.id) {
          const { data: invRow } = await supabase
            .from("invoices")
            .select("studio_id, payer_id")
            .eq("stripe_invoice_id", stripeInvoice.id)
            .single();
          studioId = studioId ?? invRow?.studio_id ?? null;
          userId = userId ?? invRow?.payer_id ?? null;
        }

        if (studioId && userId) {
          await supabase.from("notifications").insert({
            studio_id: studioId,
            user_id: userId,
            type: "payment_failed",
            title: "Payment failed",
            body: "We couldn't process your payment. Please update your payment method.",
            link: "/portal/parent",
          });
        }

        console.log(`[stripe-webhook] invoice.payment_failed — ${stripeInvoice.id}`);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        // Sync the subscriptions row (Phase 3.2 auto-pay).
        const sub = event.data.object as Stripe.Subscription & {
          current_period_end?: number | null;
        };

        const periodEpoch =
          sub.current_period_end ??
          (sub.items?.data?.[0] as { current_period_end?: number } | undefined)
            ?.current_period_end ??
          null;

        const status =
          event.type === "customer.subscription.deleted" ? "canceled" : sub.status;

        await supabase
          .from("subscriptions")
          .update({
            status,
            current_period_end: periodEpoch
              ? new Date(periodEpoch * 1000).toISOString()
              : null,
            cancel_at_period_end: sub.cancel_at_period_end ?? false,
          })
          .eq("stripe_subscription_id", sub.id);

        console.log(`[stripe-webhook] ${event.type} — subscription ${sub.id} → ${status}`);
        break;
      }

      default:
        // Unhandled event type — return 200 so Stripe doesn't retry
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[stripe-webhook] handler error:", err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
}
