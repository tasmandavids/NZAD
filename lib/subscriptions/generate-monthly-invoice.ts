import type { SupabaseClient } from "@supabase/supabase-js";
import { gstComponentCents } from "@/lib/currency";
import { xeroSyncOutstandingInvoice } from "@/lib/xero/webhook-sync";

type LineRow = {
  item_type: string;
  reference_id: string | null;
  description: string;
  quantity: number;
  unit_monthly_cents: number;
  line_total_cents: number;
  sort_order: number;
};

function dueDateFromIssue(issueDate: string): string {
  const d = new Date(`${issueDate}T12:00:00`);
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
}

export async function generateSubscriptionMonthlyInvoice(
  supabase: SupabaseClient,
  subscriptionId: string,
  billingMonth: string,
): Promise<{ ok: true; invoiceId: string } | { ok: false; error: string; skipped?: boolean }> {
  const { data: sub } = await supabase
    .from("subscriptions")
    .select(
      "id, studio_id, payer_id, student_id, status, monthly_amount_cents, plan_label, last_invoiced_month",
    )
    .eq("id", subscriptionId)
    .single();

  if (!sub) return { ok: false, error: "Subscription not found" };
  if (!["active", "trialing", "past_due"].includes(sub.status as string)) {
    return { ok: false, error: "Subscription not active", skipped: true };
  }
  if (sub.last_invoiced_month === billingMonth) {
    return { ok: false, error: "Already invoiced this month", skipped: true };
  }
  if ((sub.monthly_amount_cents as number) <= 0) {
    return { ok: false, error: "Zero amount plan", skipped: true };
  }

  const { data: lines } = await supabase
    .from("subscription_line_items")
    .select("item_type, reference_id, description, quantity, unit_monthly_cents, line_total_cents, sort_order")
    .eq("subscription_id", subscriptionId)
    .order("sort_order");

  const issueDate = `${billingMonth}-01`;
  const amountCents = sub.monthly_amount_cents as number;

  const { data: invoice, error: invErr } = await supabase
    .from("invoices")
    .insert({
      studio_id: sub.studio_id,
      payer_id: sub.payer_id,
      student_id: sub.student_id,
      subscription_id: subscriptionId,
      amount_cents: amountCents,
      gst_cents: gstComponentCents(amountCents),
      status: "sent",
      due_date: dueDateFromIssue(issueDate),
      issued_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (invErr || !invoice) {
    return { ok: false, error: invErr?.message ?? "Could not create invoice" };
  }

  const invoiceId = invoice.id as string;
  const lineRows = (lines ?? []) as LineRow[];

  if (lineRows.length) {
    await supabase.from("invoice_line_items").insert(
      lineRows.map((line) => ({
        invoice_id: invoiceId,
        item_type: line.item_type,
        reference_id: line.reference_id,
        description: line.description,
        quantity: line.quantity,
        unit_cents: line.unit_monthly_cents,
        line_total_cents: line.line_total_cents,
        sort_order: line.sort_order,
      })),
    );
  }

  const monthLabel = new Date(`${billingMonth}-01T12:00:00`).toLocaleDateString("en-NZ", {
    month: "long",
    year: "numeric",
  });

  await supabase.from("notifications").insert({
    studio_id: sub.studio_id,
    user_id: sub.payer_id,
    type: "invoice_sent",
    title: "Monthly subscription invoice",
    body: `${sub.plan_label ?? "Your subscription"} — ${monthLabel}. Please review and pay in Olune.`,
    link: "/portal/parent",
    payload: { invoice_id: invoiceId, subscription_id: subscriptionId, billing_month: billingMonth },
  });

  await supabase
    .from("subscriptions")
    .update({ last_invoiced_month: billingMonth })
    .eq("id", subscriptionId);

  const lineDescription = `${sub.plan_label ?? "Subscription"} — ${monthLabel}`;
  await xeroSyncOutstandingInvoice(supabase, invoiceId, { lineDescription });

  return { ok: true, invoiceId };
}
