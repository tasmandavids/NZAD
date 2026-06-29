import { createClient } from "@/lib/supabase/server";
import { ExpenseLog } from "@/components/portal/teacher/ExpenseLog";

export type Expense = {
  id: string;
  description: string;
  category: string;
  amountCents: number;
  expenseDate: string;
  studioId: string | null;
  studioName: string | null;
  receiptUrl: string | null;
  reimbursable: boolean;
  reimbursed: boolean;
  notes: string | null;
};

export type StudioOption = { id: string; name: string };

export default async function ExpensesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [expensesRes, membershipsRes] = await Promise.all([
    supabase
      .from("instructor_expenses")
      .select("*, studios!studio_id ( name )")
      .eq("instructor_id", user!.id)
      .order("expense_date", { ascending: false })
      .limit(200),

    supabase
      .from("studio_memberships")
      .select("studio_id, studios!inner ( id, name )")
      .eq("user_id", user!.id)
      .eq("status", "active"),
  ]);

  const expenses: Expense[] = (expensesRes.data ?? []).map((e) => {
    const studio = e.studios as unknown as { name: string } | null;
    return {
      id: e.id,
      description: e.description,
      category: e.category,
      amountCents: e.amount_cents,
      expenseDate: e.expense_date,
      studioId: e.studio_id ?? null,
      studioName: studio?.name ?? null,
      receiptUrl: e.receipt_url ?? null,
      reimbursable: Boolean(e.reimbursable),
      reimbursed: Boolean(e.reimbursed),
      notes: e.notes ?? null,
    };
  });

  const studioOptions: StudioOption[] = (membershipsRes.data ?? []).map((m) => {
    const s = m.studios as unknown as { id: string; name: string };
    return { id: s.id, name: s.name };
  });

  return <ExpenseLog expenses={expenses} studioOptions={studioOptions} />;
}
