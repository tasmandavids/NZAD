"use server";

import { createClient } from "@/lib/supabase/server";

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, userId: user.id };
}

export async function claimSubstituteRequest(requestId: string) {
  const { supabase, userId } = await getUser();
  const { error } = await supabase
    .from("substitute_requests")
    .update({ status: "filled", filled_by: userId, updated_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("status", "open");
  if (error) return { error: error.message };
  return { ok: true };
}
