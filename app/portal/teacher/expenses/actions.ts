"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const ExpenseSchema = z.object({
  description: z.string().min(1).max(300),
  category: z.enum(["travel", "equipment", "uniform", "training", "software", "marketing", "insurance", "other"]),
  amount_cents: z.number().int().nonnegative(),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  studio_id: z.string().uuid().optional().nullable(),
  receipt_url: z.string().url().optional().nullable().or(z.literal("")),
  reimbursable: z.boolean().default(false),
  reimbursed: z.boolean().default(false),
  notes: z.string().max(1000).optional().nullable(),
});

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, userId: user.id };
}

export async function createExpense(data: z.infer<typeof ExpenseSchema>) {
  const { supabase, userId } = await getUser();
  const p = ExpenseSchema.parse(data);
  const { error } = await supabase.from("instructor_expenses").insert({
    instructor_id: userId,
    ...p,
    studio_id: p.studio_id || null,
    receipt_url: p.receipt_url || null,
    notes: p.notes || null,
  });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function updateExpense(id: string, data: z.infer<typeof ExpenseSchema>) {
  const { supabase } = await getUser();
  const p = ExpenseSchema.parse(data);
  const { error } = await supabase.from("instructor_expenses").update({
    ...p,
    studio_id: p.studio_id || null,
    receipt_url: p.receipt_url || null,
    notes: p.notes || null,
  }).eq("id", id);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function markExpenseReimbursed(id: string) {
  const { supabase } = await getUser();
  const { error } = await supabase.from("instructor_expenses")
    .update({ reimbursed: true }).eq("id", id);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function deleteExpense(id: string) {
  const { supabase } = await getUser();
  const { error } = await supabase.from("instructor_expenses").delete().eq("id", id);
  if (error) return { error: error.message };
  return { ok: true };
}
