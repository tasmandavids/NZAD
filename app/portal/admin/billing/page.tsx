// ============================================================================
//  /portal/admin/billing — AR hub: create invoices, chase payments, revenue.
// ============================================================================

import { createClient } from "@/lib/supabase/server";
import { BillingDashboard } from "@/components/admin/billing/BillingDashboard";

export type InvoiceRow = {
  id: string;
  payerId: string;
  amountCents: number;
  status: string;
  dueDate: string | null;
  issuedAt: string | null;
  paidAt: string | null;
  studentName: string | null;
  payerName: string | null;
  stripePaymentIntentId: string | null;
  xeroInvoiceId: string | null;
};

export type ParentOption = {
  id: string;
  name: string;
  email: string | null;
  students: { id: string; name: string }[];
};

export type UnpaidAccount = {
  payerId: string;
  payerName: string;
  totalCents: number;
  overdueCents: number;
  invoiceCount: number;
  oldestDueDate: string | null;
};

export type RevenueSeries = { month: string; revenueCents: number }[];

export type SourceBreakdown = {
  tuitionCents: number;
  shopCents: number;
  eventsCents: number;
};

const YEAR_AGO = () => new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
const YEAR_START = () => `${new Date().getFullYear()}-01-01`;

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

function mapInvoice(inv: Record<string, unknown>): InvoiceRow {
  const student = inv.profiles as { full_name: string | null } | null;
  const payer = inv.payer as { full_name: string | null } | null;
  return {
    id: inv.id as string,
    payerId: inv.payer_id as string,
    amountCents: inv.amount_cents as number,
    status: inv.status as string,
    dueDate: (inv.due_date as string | null) ?? null,
    issuedAt: (inv.issued_at as string | null) ?? null,
    paidAt: (inv.paid_at as string | null) ?? null,
    studentName: student?.full_name ?? null,
    payerName: payer?.full_name ?? null,
    stripePaymentIntentId: (inv.stripe_payment_intent_id as string | null) ?? null,
    xeroInvoiceId: (inv.xero_invoice_id as string | null) ?? null,
  };
}

export default async function BillingPage() {
  const supabase = await createClient();
  const studioId = await currentStudioId(supabase);

  const invoiceSelect = `
    id, payer_id, amount_cents, status, due_date, issued_at, paid_at,
    stripe_payment_intent_id, xero_invoice_id,
    profiles!student_id ( full_name ),
    payer:profiles!payer_id ( full_name )
  `;

  const [
    invoicesRes,
    unpaidRes,
    parentsRes,
    guardianshipsRes,
    paidInvoicesRes,
    ytdPaidRes,
    ordersRes,
    ticketsRes,
    subsRes,
  ] = await Promise.all([
    supabase
      .from("invoices")
      .select(invoiceSelect)
      .eq("studio_id", studioId)
      .order("issued_at", { ascending: false })
      .limit(100),

    supabase
      .from("invoices")
      .select(invoiceSelect)
      .eq("studio_id", studioId)
      .in("status", ["sent", "overdue"])
      .order("due_date", { ascending: true }),

    supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("studio_id", studioId)
      .eq("role", "parent")
      .order("full_name"),

    supabase
      .from("guardianships")
      .select(`
      guardian_id,
      student:profiles!student_id ( id, full_name )
    `)
      .eq("studio_id", studioId),

    supabase
      .from("invoices")
      .select("amount_cents, paid_at")
      .eq("studio_id", studioId)
      .eq("status", "paid")
      .not("paid_at", "is", null)
      .gte("paid_at", YEAR_AGO()),

    supabase
      .from("invoices")
      .select("amount_cents")
      .eq("studio_id", studioId)
      .eq("status", "paid")
      .gte("paid_at", YEAR_START()),

    supabase
      .from("orders")
      .select("total_cents, updated_at")
      .eq("studio_id", studioId)
      .eq("status", "paid")
      .gte("updated_at", YEAR_AGO()),

    supabase
      .from("event_tickets")
      .select("total_cents, purchased_at, events!inner ( studio_id )")
      .eq("status", "paid")
      .eq("events.studio_id", studioId)
      .gte("purchased_at", YEAR_AGO()),

    supabase
      .from("subscriptions")
      .select("amount_cents, interval, status")
      .eq("studio_id", studioId)
      .in("status", ["active", "trialing", "past_due"]),
  ]);

  const invoices = (invoicesRes.data ?? []).map((inv) => mapInvoice(inv as Record<string, unknown>));
  const unpaidInvoices = (unpaidRes.data ?? []).map((inv) => mapInvoice(inv as Record<string, unknown>));

  const studentsByParent = new Map<string, { id: string; name: string }[]>();
  for (const row of guardianshipsRes.data ?? []) {
    const guardianId = row.guardian_id as string;
    const raw = row.student as unknown;
    const student = (Array.isArray(raw) ? raw[0] : raw) as { id: string; full_name: string | null } | null;
    if (!student?.id) continue;
    const list = studentsByParent.get(guardianId) ?? [];
    list.push({ id: student.id, name: student.full_name ?? "Student" });
    studentsByParent.set(guardianId, list);
  }

  const parents: ParentOption[] = (parentsRes.data ?? []).map((p) => ({
    id: p.id as string,
    name: (p.full_name as string | null) ?? "Parent",
    email: (p.email as string | null) ?? null,
    students: studentsByParent.get(p.id as string) ?? [],
  }));

  const accountMap = new Map<string, UnpaidAccount>();
  for (const inv of unpaidInvoices) {
    const existing = accountMap.get(inv.payerId) ?? {
      payerId: inv.payerId,
      payerName: inv.payerName ?? "Unknown",
      totalCents: 0,
      overdueCents: 0,
      invoiceCount: 0,
      oldestDueDate: null as string | null,
    };
    existing.totalCents += inv.amountCents;
    existing.invoiceCount += 1;
    if (inv.status === "overdue") existing.overdueCents += inv.amountCents;
    if (inv.dueDate && (!existing.oldestDueDate || inv.dueDate < existing.oldestDueDate)) {
      existing.oldestDueDate = inv.dueDate;
    }
    accountMap.set(inv.payerId, existing);
  }

  const unpaidAccounts = [...accountMap.values()].sort(
    (a, b) => b.overdueCents - a.overdueCents || b.totalCents - a.totalCents,
  );

  const monthMap = new Map<string, number>();
  for (const p of paidInvoicesRes.data ?? []) {
    if (!p.paid_at) continue;
    const month = (p.paid_at as string).slice(0, 7);
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

  const sum = <T,>(rows: T[] | null, key: (r: T) => number) =>
    (rows ?? []).reduce((s, r) => s + (key(r) || 0), 0);

  const sources: SourceBreakdown = {
    tuitionCents: sum(paidInvoicesRes.data, (r) => r.amount_cents as number),
    shopCents: sum(ordersRes.data, (r) => r.total_cents as number),
    eventsCents: sum(ticketsRes.data, (r) => r.total_cents as number),
  };

  const mrrCents = (subsRes.data ?? []).reduce((s, sub) => {
    const amt = (sub.amount_cents as number) || 0;
    return s + (sub.interval === "year" ? Math.round(amt / 12) : amt);
  }, 0);
  const activeSubs = (subsRes.data ?? []).filter((s) => s.status === "active").length;

  const totalOutstandingCents = unpaidInvoices.reduce((s, i) => s + i.amountCents, 0);
  const overdueCount = unpaidInvoices.filter((i) => i.status === "overdue").length;
  const totalPaidCents = sum(ytdPaidRes.data, (r) => r.amount_cents as number);

  return (
    <BillingDashboard
      invoices={invoices}
      unpaidInvoices={unpaidInvoices}
      unpaidAccounts={unpaidAccounts}
      parents={parents}
      revenue={revenue}
      sources={sources}
      mrrCents={mrrCents}
      activeSubs={activeSubs}
      totalPaidCents={totalPaidCents}
      totalOutstandingCents={totalOutstandingCents}
      overdueCount={overdueCount}
    />
  );
}
