"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { CURRENCY, gstComponentCents } from "@/lib/currency";
import { stripe } from "@/lib/stripe";
import { xeroSyncOutstandingInvoice } from "@/lib/xero/webhook-sync";
import { getTranslations } from "@/lib/i18n/server";

async function getAdminStudio() {
  const t = await getTranslations("errors.actions");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: t("notSignedIn"), supabase, studioId: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("studio_id, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return { error: t("adminOnly"), supabase, studioId: null };
  if (!profile.studio_id) return { error: t("noStudioFound"), supabase, studioId: null };

  return { error: null, supabase, studioId: profile.studio_id as string };
}

const CreateInvoiceSchema = z.object({
  payerId: z.string().uuid(),
  studentId: z.string().uuid().optional(),
  amountDollars: z.number().positive().max(100_000),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().max(200).optional(),
  sendNow: z.boolean().default(true),
});

export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>;

async function ensureStripeCustomer(
  supabase: Awaited<ReturnType<typeof createClient>>,
  payerId: string,
  studioId: string,
) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id, full_name, email")
    .eq("id", payerId)
    .single();

  let customerId = profile?.stripe_customer_id as string | null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile?.email ?? undefined,
      name: (profile?.full_name as string | null) ?? undefined,
      metadata: { supabase_user_id: payerId, studio_id: studioId },
    });
    customerId = customer.id;
    await supabase.from("profiles").update({ stripe_customer_id: customerId }).eq("id", payerId);
  }
  return customerId;
}

async function attachPaymentIntent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  invoice: { id: string; amount_cents: number },
  payerId: string,
  studioId: string,
  description: string,
) {
  const customerId = await ensureStripeCustomer(supabase, payerId, studioId);
  const intent = await stripe.paymentIntents.create({
    amount: invoice.amount_cents,
    currency: CURRENCY,
    customer: customerId,
    description,
    metadata: {
      invoice_id: invoice.id,
      studio_id: studioId,
      supabase_user_id: payerId,
    },
    automatic_payment_methods: { enabled: true },
  });
  await supabase
    .from("invoices")
    .update({ stripe_payment_intent_id: intent.id })
    .eq("id", invoice.id);
}

export async function createInvoice(
  input: CreateInvoiceInput,
): Promise<
  { ok: true; invoiceId: string; xeroInvoiceId?: string; xeroError?: string } | { ok: false; error: string }
> {
  const t = await getTranslations("errors.actions");
  const parsed = CreateInvoiceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: t("invalidInvoiceDetails") };

  const { error, supabase, studioId } = await getAdminStudio();
  if (error || !studioId) return { ok: false, error: error ?? t("unknown") };

  const { payerId, studentId, amountDollars, dueDate, description, sendNow } = parsed.data;
  const amountCents = Math.round(amountDollars * 100);

  const { data: payer } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", payerId)
    .eq("studio_id", studioId)
    .single();

  if (!payer) return { ok: false, error: t("parentNotFound") };

  if (studentId) {
    const { data: link } = await supabase
      .from("guardianships")
      .select("guardian_id")
      .eq("guardian_id", payerId)
      .eq("student_id", studentId)
      .maybeSingle();
    if (!link) return { ok: false, error: t("studentNotLinked") };
  }

  const status = sendNow ? "sent" : "draft";
  const now = new Date().toISOString();

  const { data: invoice, error: invErr } = await supabase
    .from("invoices")
    .insert({
      studio_id: studioId,
      payer_id: payerId,
      student_id: studentId ?? null,
      amount_cents: amountCents,
      gst_cents: gstComponentCents(amountCents),
      status,
      due_date: dueDate,
      issued_at: sendNow ? now : null,
    })
    .select("id, amount_cents, studio_id")
    .single();

  if (invErr || !invoice) return { ok: false, error: invErr?.message ?? t("couldNotCreateInvoice") };

  const label = description?.trim() || "Studio invoice";
  if (sendNow) {
    try {
      await attachPaymentIntent(supabase, invoice, payerId, studioId, label);
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Invoice created but payment link failed.",
      };
    }

    const amount = (amountCents / 100).toFixed(2);
    await supabase.from("notifications").insert({
      studio_id: studioId,
      user_id: payerId,
      type: "invoice_sent",
      title: "New invoice from your studio",
      body: `${label} — $${amount} due ${dueDate}. Sign in to Olune to pay.`,
      link: "/portal/parent",
      payload: { invoice_id: invoice.id, amount_cents: amountCents },
    });
  }

  let xeroInvoiceId: string | undefined;
  let xeroError: string | undefined;
  if (sendNow) {
    const xero = await xeroSyncOutstandingInvoice(supabase, invoice.id as string, {
      lineDescription: label,
    });
    if (xero.ok) xeroInvoiceId = xero.xeroInvoiceId;
    else xeroError = xero.error;
  }

  revalidatePath("/portal/admin/billing");
  return { ok: true, invoiceId: invoice.id as string, xeroInvoiceId, xeroError };
}

export async function sendPaymentReminder(
  invoiceId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const t = await getTranslations("errors.actions");
  const { error, supabase, studioId } = await getAdminStudio();
  if (error || !studioId) return { ok: false, error: error ?? t("unknown") };

  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, payer_id, amount_cents, due_date, status, stripe_payment_intent_id")
    .eq("id", invoiceId)
    .eq("studio_id", studioId)
    .single();

  if (!invoice) return { ok: false, error: t("invoiceNotFound") };
  if (!["sent", "overdue"].includes(invoice.status as string)) {
    return { ok: false, error: t("unpaidInvoicesOnly") };
  }

  const payerId = invoice.payer_id as string;
  const amount = ((invoice.amount_cents as number) / 100).toFixed(2);
  const due = invoice.due_date as string | null;
  const isOverdue = invoice.status === "overdue";

  if (!invoice.stripe_payment_intent_id) {
    try {
      await attachPaymentIntent(
        supabase,
        invoice,
        payerId,
        studioId,
        isOverdue ? "Overdue studio invoice" : "Studio invoice reminder",
      );
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Could not prepare payment link." };
    }
  }

  const { error: notifyErr } = await supabase.from("notifications").insert({
    studio_id: studioId,
    user_id: payerId,
    type: "payment_reminder",
    title: isOverdue ? "Payment overdue — action needed" : "Friendly payment reminder",
    body: due
      ? `Invoice for $${amount} was due ${due}. Please pay via your Olune parent portal.`
      : `Invoice for $${amount} is outstanding. Please pay via your Olune parent portal.`,
    link: "/portal/parent",
    payload: { invoice_id: invoiceId, amount_cents: invoice.amount_cents },
  });

  if (notifyErr) return { ok: false, error: notifyErr.message };

  revalidatePath("/portal/admin/billing");
  return { ok: true };
}

export async function sendBulkPaymentReminders(
  invoiceIds: string[],
): Promise<{ ok: true; sent: number } | { ok: false; error: string }> {
  const t = await getTranslations("errors.actions");
  if (!invoiceIds.length) return { ok: false, error: t("noInvoicesSelected") };

  let sent = 0;
  for (const id of invoiceIds) {
    const res = await sendPaymentReminder(id);
    if (res.ok) sent += 1;
  }

  if (sent === 0) return { ok: false, error: t("noRemindersSent") };
  return { ok: true, sent };
}
