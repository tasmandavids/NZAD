"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const LineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unit_cents: z.number().int().nonnegative(),
});

const InvoiceSchema = z.object({
  recipient_label: z.string().min(1).max(120),
  studio_id: z.string().uuid().optional().nullable(),
  private_client_id: z.string().uuid().optional().nullable(),
  description: z.string().min(1).max(500),
  line_items: z.array(LineItemSchema),
  amount_cents: z.number().int().nonnegative(),
  due_date: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

async function requireTeacher() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, userId: user.id };
}

export async function createContractorInvoice(data: z.infer<typeof InvoiceSchema>) {
  const { supabase, userId } = await requireTeacher();
  const parsed = InvoiceSchema.parse(data);
  const { error } = await supabase.from("contractor_invoices").insert({
    instructor_id: userId,
    ...parsed,
    status: "draft",
  });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function updateContractorInvoice(id: string, data: z.infer<typeof InvoiceSchema>) {
  const { supabase } = await requireTeacher();
  const parsed = InvoiceSchema.parse(data);
  const { error } = await supabase.from("contractor_invoices").update({
    ...parsed,
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function markInvoiceSent(id: string) {
  const { supabase } = await requireTeacher();
  const { error } = await supabase.from("contractor_invoices")
    .update({ status: "sent", updated_at: new Date().toISOString() })
    .eq("id", id).eq("status", "draft");
  if (error) return { error: error.message };
  return { ok: true };
}

export async function markInvoicePaid(id: string) {
  const { supabase } = await requireTeacher();
  const { error } = await supabase.from("contractor_invoices")
    .update({ status: "paid", paid_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id).in("status", ["sent", "draft"]);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function voidContractorInvoice(id: string) {
  const { supabase } = await requireTeacher();
  const { error } = await supabase.from("contractor_invoices")
    .update({ status: "void", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function deleteContractorInvoice(id: string) {
  const { supabase } = await requireTeacher();
  const { error } = await supabase.from("contractor_invoices")
    .delete().eq("id", id).eq("status", "draft");
  if (error) return { error: error.message };
  return { ok: true };
}
