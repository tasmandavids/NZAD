import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { WalletPageClient } from "./WalletPageClient";

export default async function WalletPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [invoicesRes, plansRes, subsRes] = await Promise.all([
    supabase
      .from("invoices")
      .select(`
        id, amount_cents, gst_cents, status, due_date, issued_at,
        profiles!student_id ( full_name )
      `)
      .eq("payer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),

    supabase
      .from("term_payment_plans")
      .select(`
        id, total_cents, amount_paid_cents, next_due_date,
        installment_amounts, installments_paid, installment_count
      `)
      .eq("payer_id", user.id)
      .eq("status", "active")
      .limit(20),

    supabase
      .from("subscriptions")
      .select("id, status")
      .eq("payer_id", user.id)
      .eq("status", "active")
      .limit(10),
  ]);

  const invoices = (invoicesRes.data ?? []).map((inv) => {
    const p = inv.profiles as unknown as { full_name: string | null } | null;
    return {
      id: inv.id as string,
      studentName: p?.full_name ?? null,
      description: null,
      amountCents: inv.amount_cents as number,
      gstCents: inv.gst_cents as number,
      status: inv.status as string,
      dueDate: (inv.due_date as string | null) ?? null,
      issuedAt: (inv.issued_at as string | null) ?? null,
    };
  });

  const paymentPlans = (plansRes.data ?? []).map((p) => {
    const amounts = (p.installment_amounts as number[]) ?? [];
    const paid = (p.installments_paid as number) ?? 0;
    const nextAmount = amounts[paid] ?? null;
    return {
      id: p.id as string,
      name: `Payment plan — ${paid}/${p.installment_count as number} paid`,
      totalCents: p.total_cents as number,
      paidCents: (p.amount_paid_cents as number) ?? 0,
      nextDueCents: nextAmount,
      nextDueDate: (p.next_due_date as string | null) ?? null,
      studentName: null,
    };
  });

  const hasActiveSub = (subsRes.data ?? []).length > 0;
  const autopay = { enabled: hasActiveSub, cardLast4: null, cardBrand: null };

  return (
    <WalletPageClient
      invoices={invoices}
      paymentPlans={paymentPlans}
      autopay={autopay}
    />
  );
}
