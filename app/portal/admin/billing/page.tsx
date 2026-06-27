// ============================================================================
//  /portal/admin/billing — AR hub: create invoices, chase payments, revenue.
// ============================================================================

import dynamic from "next/dynamic";
import { requirePortalSession } from "@/lib/portal/session";
import { getTranslations } from "@/lib/i18n/server";

const BillingDashboard = dynamic(
  () => import("@/components/admin/billing/BillingDashboard").then((m) => m.BillingDashboard),
  {
    loading: () => (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    ),
  },
);

export type InvoiceRow = {
  id: string;
  invoiceNumber: number;
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

export type BillingSubscriptionRow = {
  id: string;
  stripeSubscriptionId: string | null;
  planLabel: string | null;
  payerName: string | null;
  studentName: string | null;
  monthlyAmountCents: number;
  billingInterval: string;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

const YEAR_AGO = () => new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
const YEAR_START = () => `${new Date().getFullYear()}-01-01`;

function mapInvoice(inv: Record<string, unknown>): InvoiceRow {
  const student = inv.profiles as { full_name: string | null } | null;
  const payer = inv.payer as { full_name: string | null } | null;
  return {
    id: inv.id as string,
    invoiceNumber: inv.invoice_number as number,
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
  const { supabase, studioId } = await requirePortalSession();
  const tCommon = await getTranslations("common");

  const invoiceSelect = `
    id, invoice_number, payer_id, amount_cents, status, due_date, issued_at, paid_at,
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
      .select(
        "id, stripe_subscription_id, plan_label, amount_cents, monthly_amount_cents, billing_interval, interval, status, current_period_end, cancel_at_period_end, payer_id, student_id",
      )
      .eq("studio_id", studioId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const subProfileIds = [
    ...new Set(
      (subsRes.data ?? [])
        .flatMap((s) => [s.payer_id, s.student_id])
        .filter(Boolean) as string[],
    ),
  ];

  const subProfilesRes =
    subProfileIds.length > 0
      ? await supabase.from("profiles").select("id, full_name").in("id", subProfileIds)
      : { data: [] as { id: string; full_name: string | null }[] };

  const subNameMap = new Map<string, string>();
  for (const p of subProfilesRes.data ?? []) {
    if (p.full_name) subNameMap.set(p.id as string, p.full_name as string);
  }

  const invoices = (invoicesRes.data ?? []).map((inv) => mapInvoice(inv as Record<string, unknown>));
  const unpaidInvoices = (unpaidRes.data ?? []).map((inv) => mapInvoice(inv as Record<string, unknown>));

  const studentsByParent = new Map<string, { id: string; name: string }[]>();
  for (const row of guardianshipsRes.data ?? []) {
    const guardianId = row.guardian_id as string;
    const raw = row.student as unknown;
    const student = (Array.isArray(raw) ? raw[0] : raw) as { id: string; full_name: string | null } | null;
    if (!student?.id) continue;
    const list = studentsByParent.get(guardianId) ?? [];
    list.push({ id: student.id, name: student.full_name ?? tCommon("student") });
    studentsByParent.set(guardianId, list);
  }

  const parents: ParentOption[] = (parentsRes.data ?? []).map((p) => ({
    id: p.id as string,
    name: (p.full_name as string | null) ?? tCommon("parent"),
    email: (p.email as string | null) ?? null,
    students: studentsByParent.get(p.id as string) ?? [],
  }));

  const accountMap = new Map<string, UnpaidAccount>();
  for (const inv of unpaidInvoices) {
    const existing = accountMap.get(inv.payerId) ?? {
      payerId: inv.payerId,
      payerName: inv.payerName ?? tCommon("unknown"),
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

  const subscriptions: BillingSubscriptionRow[] = (subsRes.data ?? []).map((s) => ({
    id: s.id as string,
    stripeSubscriptionId: s.stripe_subscription_id as string | null,
    planLabel: s.plan_label as string | null,
    payerName: s.payer_id ? (subNameMap.get(s.payer_id as string) ?? null) : null,
    studentName: s.student_id ? (subNameMap.get(s.student_id as string) ?? null) : null,
    monthlyAmountCents: Number(s.monthly_amount_cents ?? s.amount_cents ?? 0),
    billingInterval: (s.billing_interval as string) ?? (s.interval as string) ?? "month",
    status: (s.status as string) ?? "incomplete",
    currentPeriodEnd: s.current_period_end as string | null,
    cancelAtPeriodEnd: Boolean(s.cancel_at_period_end),
  }));

  const mrrCents = subscriptions
    .filter((s) => ["active", "trialing", "past_due"].includes(s.status))
    .reduce((s, sub) => s + sub.monthlyAmountCents, 0);
  const activeSubs = subscriptions.filter((s) => s.status === "active").length;

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
      subscriptions={subscriptions}
    />
  );
}
