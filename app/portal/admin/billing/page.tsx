// ============================================================================
//  /portal/admin/billing — Invoice dashboard, monthly revenue chart,
//  revenue-by-source breakdown + MRR.
//  Server component: fetches invoices, orders, event tickets & subscriptions.
// ============================================================================

import { createClient } from "@/lib/supabase/server";
import { BillingDashboard } from "@/components/admin/billing/BillingDashboard";

export type InvoiceRow = {
  id: string;
  amountCents: number;
  status: string;
  dueDate: string | null;
  issuedAt: string | null;
  paidAt: string | null;
  studentName: string | null;
  payerName: string | null;
  stripePaymentIntentId: string | null;
};

export type RevenueSeries = { month: string; revenueCents: number }[];

/** Net revenue grouped by product line (trailing 12 months, refunds excluded). */
export type SourceBreakdown = {
  tuitionCents: number; // paid invoices (incl. auto-pay mirror)
  shopCents: number; // paid shop orders
  eventsCents: number; // paid event tickets
};

const YEAR_AGO = () => new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();

async function currentStudioId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data } = await supabase
    .from("profiles")
    .select("studio_id")
    .eq("id", user!.id)
    .single();
  return data?.studio_id as string;
}

export default async function BillingPage() {
  const supabase = await createClient();
  const studioId = await currentStudioId(supabase);

  const [invoicesRes, paidInvoicesRes, ordersRes, ticketsRes, subsRes] = await Promise.all([
    // Invoice table (most recent 100)
    supabase
      .from("invoices")
      .select(`
        id, amount_cents, status, due_date, issued_at, paid_at, stripe_payment_intent_id,
        profiles!student_id ( full_name ),
        payer:profiles!payer_id ( full_name )
      `)
      .eq("studio_id", studioId)
      .order("issued_at", { ascending: false })
      .limit(100),

    // Trailing-12-month paid invoices → monthly chart + tuition source
    supabase
      .from("invoices")
      .select("amount_cents, paid_at")
      .eq("studio_id", studioId)
      .eq("status", "paid")
      .not("paid_at", "is", null)
      .gte("paid_at", YEAR_AGO()),

    // Shop orders (paid) → merch source
    supabase
      .from("orders")
      .select("total_cents, updated_at")
      .eq("studio_id", studioId)
      .eq("status", "paid")
      .gte("updated_at", YEAR_AGO()),

    // Event tickets (paid) → events source. Scoped to the studio via the event.
    supabase
      .from("event_tickets")
      .select("total_cents, purchased_at, events!inner ( studio_id )")
      .eq("status", "paid")
      .eq("events.studio_id", studioId)
      .gte("purchased_at", YEAR_AGO()),

    // Active subscriptions → MRR
    supabase
      .from("subscriptions")
      .select("amount_cents, interval, status")
      .eq("studio_id", studioId)
      .in("status", ["active", "trialing", "past_due"]),
  ]);

  const invoices: InvoiceRow[] = (invoicesRes.data ?? []).map((inv) => {
    const student = inv.profiles as unknown as { full_name: string | null } | null;
    const payer = inv.payer as unknown as { full_name: string | null } | null;
    return {
      id: inv.id,
      amountCents: inv.amount_cents,
      status: inv.status,
      dueDate: inv.due_date,
      issuedAt: inv.issued_at,
      paidAt: inv.paid_at,
      studentName: student?.full_name ?? null,
      payerName: payer?.full_name ?? null,
      stripePaymentIntentId: inv.stripe_payment_intent_id ?? null,
    };
  });

  // Build monthly revenue series from paid invoices.
  const monthMap = new Map<string, number>();
  for (const p of paidInvoicesRes.data ?? []) {
    if (!p.paid_at) continue;
    const month = (p.paid_at as string).slice(0, 7); // "YYYY-MM"
    monthMap.set(month, (monthMap.get(month) ?? 0) + (p.amount_cents as number));
  }
  const revenue: RevenueSeries = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const key = d.toISOString().slice(0, 7);
    revenue.push({ month: key, revenueCents: monthMap.get(key) ?? 0 });
  }

  // Revenue by source (trailing 12 months). Refunded rows leave the 'paid'
  // status so they're naturally excluded.
  const sum = <T,>(rows: T[] | null, key: (r: T) => number) =>
    (rows ?? []).reduce((s, r) => s + (key(r) || 0), 0);

  const sources: SourceBreakdown = {
    tuitionCents: sum(paidInvoicesRes.data, (r) => r.amount_cents as number),
    shopCents: sum(ordersRes.data, (r) => r.total_cents as number),
    eventsCents: sum(ticketsRes.data, (r) => r.total_cents as number),
  };

  // MRR — normalise yearly plans to a monthly figure.
  const mrrCents = (subsRes.data ?? []).reduce((s, sub) => {
    const amt = (sub.amount_cents as number) || 0;
    return s + (sub.interval === "year" ? Math.round(amt / 12) : amt);
  }, 0);
  const activeSubs = (subsRes.data ?? []).filter((s) => s.status === "active").length;

  // Summary stats (from the recent invoice list).
  const totalPaid = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amountCents, 0);
  const totalOutstanding = invoices
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .reduce((s, i) => s + i.amountCents, 0);
  const overdue = invoices.filter((i) => i.status === "overdue").length;

  return (
    <BillingDashboard
      invoices={invoices}
      revenue={revenue}
      sources={sources}
      mrrCents={mrrCents}
      activeSubs={activeSubs}
      totalPaidCents={totalPaid}
      totalOutstandingCents={totalOutstanding}
      overdueCount={overdue}
    />
  );
}
