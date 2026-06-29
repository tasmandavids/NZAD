"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requirePortalSession } from "@/lib/portal/session";

const ClientSchema = z.object({
  full_name: z.string().min(1).max(120),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

async function requireTeacher() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, userId: user.id };
}

export async function createPrivateClient(data: z.infer<typeof ClientSchema>) {
  const { supabase, userId } = await requireTeacher();
  const parsed = ClientSchema.parse(data);
  const { error } = await supabase.from("private_clients").insert({
    instructor_id: userId,
    full_name: parsed.full_name,
    email: parsed.email || null,
    phone: parsed.phone || null,
    notes: parsed.notes || null,
  });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function updatePrivateClient(id: string, data: z.infer<typeof ClientSchema>) {
  const { supabase } = await requireTeacher();
  const parsed = ClientSchema.parse(data);
  const { error } = await supabase.from("private_clients").update({
    full_name: parsed.full_name,
    email: parsed.email || null,
    phone: parsed.phone || null,
    notes: parsed.notes || null,
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function deletePrivateClient(id: string) {
  const { supabase } = await requireTeacher();
  const { error } = await supabase.from("private_clients").delete().eq("id", id);
  if (error) return { error: error.message };
  return { ok: true };
}
