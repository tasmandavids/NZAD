"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requirePortalSession } from "@/lib/portal/session";

const RequestSchema = z.object({
  class_id: z.string().uuid().optional().nullable(),
  class_name: z.string().min(1).max(120),
  discipline: z.string().max(60).optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
  notes: z.string().max(500).optional().nullable(),
});

export async function createSubstituteRequest(data: z.infer<typeof RequestSchema>) {
  const { supabase, studioId, userId } = await requirePortalSession();
  const parsed = RequestSchema.parse(data);
  const { error } = await supabase.from("substitute_requests").insert({
    studio_id: studioId,
    posted_by: userId,
    ...parsed,
    class_id: parsed.class_id || null,
    discipline: parsed.discipline || null,
    notes: parsed.notes || null,
  });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function cancelSubstituteRequest(id: string) {
  const { supabase } = await requirePortalSession();
  const { error } = await supabase
    .from("substitute_requests")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function reopenSubstituteRequest(id: string) {
  const { supabase } = await requirePortalSession();
  const { error } = await supabase
    .from("substitute_requests")
    .update({ status: "open", filled_by: null, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  return { ok: true };
}
