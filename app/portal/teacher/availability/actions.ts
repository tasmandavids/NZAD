"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const SlotSchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
  notes: z.string().max(300).optional().nullable(),
});

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, userId: user.id };
}

export async function addAvailabilitySlot(data: z.infer<typeof SlotSchema>) {
  const { supabase, userId } = await getUser();
  const parsed = SlotSchema.parse(data);
  const { error } = await supabase.from("instructor_availability").insert({
    instructor_id: userId,
    ...parsed,
    notes: parsed.notes || null,
  });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function updateAvailabilitySlot(id: string, data: z.infer<typeof SlotSchema>) {
  const { supabase } = await getUser();
  const parsed = SlotSchema.parse(data);
  const { error } = await supabase.from("instructor_availability")
    .update({ ...parsed, notes: parsed.notes || null })
    .eq("id", id);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function deleteAvailabilitySlot(id: string) {
  const { supabase } = await getUser();
  const { error } = await supabase.from("instructor_availability").delete().eq("id", id);
  if (error) return { error: error.message };
  return { ok: true };
}
