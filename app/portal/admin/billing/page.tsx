// ============================================================================
//  /portal/admin/billing — Invoice dashboard + monthly revenue chart.
//  Server component: fetches invoices + monthly revenue series.
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
};

export type RevenueSeries = { month: string; revenueCents: number }[];

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

  const [invoicesRes, paymentsRes] = await Promise.all([
    supabase
      .from("invoices")
      .select(`
        id, amount_cents, status, due_date, issued_at, paid_at,
        profiles!student_id ( full_name ),
        payer:profiles!payer_id ( full_name )
      `)
      .eq("studio_id", studioId)
      .order("issued_at", { ascending: false })
      .limit(100),

    // Monthly revenue: sum of paid invoice amounts for last 12 months
    supabase
      .from("invoices")
      .select("amount_cents, paid_at")
      .eq("studio_id", studioId)
      .eq("status", "paid")
      .not("paid_at", "is", null)
      .gte("paid_at", new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()),
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
    };
  });

  // Build monthly revenue series
  const monthMap = new Map<string, number>();
  for (const p of paymentsRes.data ?? []) {
    if (!p.paid_at) continue;
    const month = (p.paid_at as string).slice(0, 7); // "YYYY-MM"
    monthMap.set(month, (monthMap.get(month) ?? 0) + (p.amount_cents as number));
  }
  // Fill last 12 months with 0 if missing
  const revenue: RevenueSeries = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const key = d.toISOString().slice(0, 7);
    revenue.push({ month: key, revenueCents: monthMap.get(key) ?? 0 });
  }

  // Summary stats
  const totalPaid = invoices
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + i.amountCents, 0);
  const totalOutstanding = invoices
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .reduce((s, i) => s + i.amountCents, 0);
  const overdue = invoices.filter((i) => i.status === "overdue").length;

  return (
    <BillingDashboard
      invoices={invoices}
      revenue={revenue}
      totalPaidCents={totalPaid}
      totalOutstandingCents={totalOutstanding}
      overdueCount={overdue}
    />
  );
}
