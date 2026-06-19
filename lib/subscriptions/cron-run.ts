import type { SupabaseClient } from "@supabase/supabase-js";
import { generateSubscriptionMonthlyInvoice } from "./generate-monthly-invoice";

export async function runSubscriptionInvoicesForStudio(
  supabase: SupabaseClient,
  studioId: string,
  billingMonth: string,
): Promise<{ generated: number; skipped: number; errors: string[] }> {
  const { data: subs } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("studio_id", studioId)
    .eq("admin_created", true)
    .in("status", ["active", "trialing", "past_due"]);

  let generated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const sub of subs ?? []) {
    const res = await generateSubscriptionMonthlyInvoice(supabase, sub.id as string, billingMonth);
    if (res.ok) generated += 1;
    else if (res.skipped) skipped += 1;
    else errors.push(`${sub.id}: ${res.error}`);
  }

  return { generated, skipped, errors };
}
