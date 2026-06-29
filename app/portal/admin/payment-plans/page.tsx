import { requirePortalSession } from "@/lib/portal/session";
import { TermPaymentPlansManager } from "@/components/admin/payment-plans/TermPaymentPlansManager";

export type TermPlan = {
  id: string;
  payerId: string;
  payerName: string | null;
  totalCents: number;
  installmentCount: number;
  installmentAmounts: number[];
  installmentsPaid: number;
  amountPaidCents: number;
  nextDueDate: string | null;
  status: "active" | "completed" | "cancelled";
  createdAt: string;
};

export type PayerOption = { id: string; name: string; email: string | null };
export type UnpaidInvoice = { id: string; invoiceNumber: number; amountCents: number; payerId: string; description: string | null };

export default async function PaymentPlansPage() {
  const { supabase, studioId } = await requirePortalSession();

  const [plansRes, payersRes, invoicesRes] = await Promise.all([
    supabase
      .from("term_payment_plans")
      .select(`
        id, payer_id, total_cents, installment_count, installment_amounts,
        installments_paid, amount_paid_cents, next_due_date, status, created_at,
        payer:profiles!payer_id ( full_name )
      `)
      .eq("studio_id", studioId)
      .order("created_at", { ascending: false })
      .limit(100),

    supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("studio_id", studioId)
      .eq("role", "parent")
      .order("full_name"),

    supabase
      .from("invoices")
      .select("id, invoice_number, amount_cents, payer_id, description")
      .eq("studio_id", studioId)
      .in("status", ["sent", "overdue"])
      .is("term_payment_plan_id", null)
      .order("issued_at", { ascending: false })
      .limit(200),
  ]);

  const plans: TermPlan[] = (plansRes.data ?? []).map((p) => {
    const payer = p.payer as unknown as { full_name: string | null } | null;
    return {
      id: p.id,
      payerId: p.payer_id,
      payerName: payer?.full_name ?? null,
      totalCents: p.total_cents,
      installmentCount: p.installment_count,
      installmentAmounts: p.installment_amounts as number[],
      installmentsPaid: p.installments_paid,
      amountPaidCents: p.amount_paid_cents,
      nextDueDate: p.next_due_date ?? null,
      status: p.status as TermPlan["status"],
      createdAt: p.created_at,
    };
  });

  const payers: PayerOption[] = (payersRes.data ?? []).map((p) => ({
    id: p.id, name: p.full_name ?? "Parent", email: p.email ?? null,
  }));

  const unpaidInvoices: UnpaidInvoice[] = (invoicesRes.data ?? []).map((i) => ({
    id: i.id,
    invoiceNumber: i.invoice_number,
    amountCents: i.amount_cents,
    payerId: i.payer_id,
    description: i.description ?? null,
  }));

  return <TermPaymentPlansManager plans={plans} payers={payers} unpaidInvoices={unpaidInvoices} />;
}
