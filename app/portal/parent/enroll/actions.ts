"use server";

// ============================================================================
//  Parent enrollment server actions
//  Called from EnrollModal to drive the multi-step enrollment flow.
// ============================================================================

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CURRENCY, gstComponentCents } from "@/lib/currency";
import { siblingDiscountedCents } from "@/lib/discounts";

// ─── Types ──────────────────────────────────────────────────────────────────

export type ActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type AvailableClass = {
  id: string;
  name: string;
  discipline: string | null;
  level: string | null;
  dayOfWeek: number | null;
  startTime: string | null;
  capacity: number;
  enrolled: number;
  priceCents: number;
};

export type Waiver = {
  id: string;
  title: string;
  content: string;
  version: number;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

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

  return {
    error: null,
    supabase,
    userId: user.id,
    studioId: profile.studio_id as string,
  };
}

// ─── Get available classes ───────────────────────────────────────────────────

export async function getAvailableClasses(): Promise<ActionResult<AvailableClass[]>> {
  const { error, supabase } = await getParentContext();
  if (error) return { ok: false, error };

  const { data, error: dbErr } = await supabase
    .from("class_capacity")
    .select("id, name, discipline, level, day_of_week, start_time, capacity, enrolled")
    .order("day_of_week")
    .order("start_time");

  if (dbErr) return { ok: false, error: dbErr.message };

  // Also fetch prices from classes table
  const ids = (data ?? []).map((r) => r.id as string);
  const { data: priceData } = await supabase
    .from("classes")
    .select("id, price_cents")
    .in("id", ids);

  const priceMap = new Map((priceData ?? []).map((r) => [r.id, r.price_cents as number]));

  const classes: AvailableClass[] = (data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    discipline: r.discipline as string | null,
    level: r.level as string | null,
    dayOfWeek: r.day_of_week as number | null,
    startTime: r.start_time ? (r.start_time as string).slice(0, 5) : null,
    capacity: Number(r.capacity ?? 0),
    enrolled: Number(r.enrolled ?? 0),
    priceCents: priceMap.get(r.id as string) ?? 0,
  }));

  return { ok: true, data: classes };
}

// ─── Get studio waivers ──────────────────────────────────────────────────────

export async function getActiveWaivers(): Promise<ActionResult<Waiver[]>> {
  const { error, supabase } = await getParentContext();
  if (error) return { ok: false, error };

  const { data, error: dbErr } = await supabase
    .from("waivers")
    .select("id, title, content, version")
    .eq("active", true)
    .eq("required", true)
    .order("created_at");

  if (dbErr) return { ok: false, error: dbErr.message };

  return {
    ok: true,
    data: (data ?? []).map((w) => ({
      id: w.id as string,
      title: w.title as string,
      content: w.content as string,
      version: w.version as number,
    })),
  };
}

// ─── Sign a waiver for a student ────────────────────────────────────────────

export async function signWaiver(
  waiverId: string,
  studentId: string,
  waiverVersion: number,
): Promise<ActionResult> {
  const { error, supabase, userId } = await getParentContext();
  if (error || !userId) return { ok: false, error: error ?? "Unknown" };

  // Verify guardian relationship
  const { data: guardianship } = await supabase
    .from("guardianships")
    .select("guardian_id")
    .eq("guardian_id", userId)
    .eq("student_id", studentId)
    .single();

  if (!guardianship) return { ok: false, error: "You are not a guardian of this student." };

  // Upsert — idempotent if already signed this version
  const { error: dbErr } = await supabase
    .from("waiver_signatures")
    .upsert(
      {
        waiver_id: waiverId,
        student_id: studentId,
        signed_by: userId,
        waiver_version: waiverVersion,
      },
      { onConflict: "waiver_id,student_id,waiver_version", ignoreDuplicates: true },
    );

  if (dbErr) return { ok: false, error: dbErr.message };
  return { ok: true, data: null };
}

// ─── Enroll a student in a class ────────────────────────────────────────────

export async function enrollChildInClass(
  studentId: string,
  classId: string,
): Promise<ActionResult<{ enrollmentId: string; waitlisted: boolean }>> {
  const { error, supabase, userId, studioId } = await getParentContext();
  if (error || !userId || !studioId) return { ok: false, error: error ?? "Unknown" };

  // Verify guardian relationship
  const { data: guardianship } = await supabase
    .from("guardianships")
    .select("guardian_id")
    .eq("guardian_id", userId)
    .eq("student_id", studentId)
    .single();

  if (!guardianship) return { ok: false, error: "You are not a guardian of this student." };

  // Check for existing enrollment
  const { data: existing } = await supabase
    .from("enrollments")
    .select("id, status")
    .eq("student_id", studentId)
    .eq("class_id", classId)
    .single();

  if (existing?.status === "active") {
    return { ok: false, error: "Already enrolled in this class." };
  }

  // Check capacity
  const { data: cap } = await supabase
    .from("class_capacity")
    .select("capacity, enrolled")
    .eq("id", classId)
    .single();

  const isFull = cap ? Number(cap.enrolled) >= Number(cap.capacity) : false;
  const status = isFull ? "waitlisted" : "active";

  const { data: enrollment, error: dbErr } = await supabase
    .from("enrollments")
    .insert({
      student_id: studentId,
      class_id: classId,
      status,
    })
    .select("id")
    .single();

  if (dbErr) return { ok: false, error: dbErr.message };

  revalidatePath("/portal/parent");
  return {
    ok: true,
    data: {
      enrollmentId: enrollment.id as string,
      waitlisted: isFull,
    },
  };
}

// ─── Create invoice + PaymentIntent for a paid enrollment ────────────────────
//  Returns a Stripe clientSecret consumed by the EnrollModal <CheckoutForm />.
//  The payment_intent.succeeded webhook (metadata.invoice_id) marks the invoice
//  paid and records the payment row server-side.

export async function createEnrollmentIntent(
  studentId: string,
  classId: string,
  className: string,
  priceCents: number,
): Promise<ActionResult<{ clientSecret: string; invoiceId: string }>> {
  const { error, supabase, userId, studioId } = await getParentContext();
  if (error || !userId || !studioId) return { ok: false, error: error ?? "Unknown" };
  if (priceCents <= 0) return { ok: false, error: "Class has no fee." };

  // Verify guardian relationship.
  const { data: guardianship } = await supabase
    .from("guardianships")
    .select("guardian_id")
    .eq("guardian_id", userId)
    .eq("student_id", studentId)
    .single();

  if (!guardianship) return { ok: false, error: "You are not a guardian of this student." };

  // ── Sibling / family discount (Phase 3.3) ──────────────────────────────────
  // If this family already has another ACTIVE student enrolled, apply the
  // studio's configured percentage discount to this enrollment.
  const chargeCents = await siblingDiscountedCents(
    supabase,
    studioId,
    userId,
    studentId,
    priceCents,
  );

  // Create the invoice (status 'sent' — owed until the webhook marks it paid).
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7);

  const { data: invoice, error: invErr } = await supabase
    .from("invoices")
    .insert({
      studio_id:    studioId,
      payer_id:     userId,
      student_id:   studentId,
      amount_cents: chargeCents,
      gst_cents:    gstComponentCents(chargeCents),
      status:       "sent",
      due_date:     dueDate.toISOString().slice(0, 10),
      issued_at:    new Date().toISOString(),
    })
    .select("id")
    .single();

  if (invErr || !invoice) return { ok: false, error: invErr?.message ?? "Could not create invoice." };

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

  const intent = await stripe.paymentIntents.create({
    amount:      chargeCents,
    currency:    CURRENCY,
    customer:    customerId,
    description: `Enrollment — ${className}`,
    metadata: {
      invoice_id:       invoice.id as string,
      studio_id:        studioId,
      supabase_user_id: userId,
      student_id:       studentId,
      class_id:         classId,
    },
  });

  await supabase
    .from("invoices")
    .update({ stripe_payment_intent_id: intent.id })
    .eq("id", invoice.id);

  if (!intent.client_secret) return { ok: false, error: "Stripe did not return a client secret." };

  return { ok: true, data: { clientSecret: intent.client_secret, invoiceId: invoice.id as string } };
}
