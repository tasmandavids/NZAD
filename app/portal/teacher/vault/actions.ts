"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const DocSchema = z.object({
  title: z.string().min(1).max(200),
  doc_type: z.enum(["certificate", "qualification", "insurance", "working_with_children", "first_aid", "other"]),
  issuer: z.string().max(200).optional().nullable(),
  issued_date: z.string().optional().nullable(),
  expiry_date: z.string().optional().nullable(),
  file_url: z.string().url().optional().nullable().or(z.literal("")),
  notes: z.string().max(1000).optional().nullable(),
});

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, userId: user.id };
}

export async function createDocument(data: z.infer<typeof DocSchema>) {
  const { supabase, userId } = await getUser();
  const p = DocSchema.parse(data);
  const { error } = await supabase.from("instructor_documents").insert({
    instructor_id: userId,
    ...p,
    issuer: p.issuer || null,
    issued_date: p.issued_date || null,
    expiry_date: p.expiry_date || null,
    file_url: p.file_url || null,
    notes: p.notes || null,
  });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function updateDocument(id: string, data: z.infer<typeof DocSchema>) {
  const { supabase } = await getUser();
  const p = DocSchema.parse(data);
  const { error } = await supabase.from("instructor_documents").update({
    ...p,
    issuer: p.issuer || null,
    issued_date: p.issued_date || null,
    expiry_date: p.expiry_date || null,
    file_url: p.file_url || null,
    notes: p.notes || null,
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function deleteDocument(id: string) {
  const { supabase } = await getUser();
  const { error } = await supabase.from("instructor_documents").delete().eq("id", id);
  if (error) return { error: error.message };
  return { ok: true };
}
