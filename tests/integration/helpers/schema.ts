import type { SupabaseClient } from "@supabase/supabase-js";

const REQUIRED_TABLES = [
  "enrollments",
  "classes",
  "notifications",
  "stripe_events",
  "orders",
  "order_items",
  "products",
] as const;

export type RequiredTable = (typeof REQUIRED_TABLES)[number];

/** Returns tables missing from the connected project (public schema). */
export async function missingTables(
  supabase: SupabaseClient,
): Promise<RequiredTable[]> {
  const missing: RequiredTable[] = [];

  for (const table of REQUIRED_TABLES) {
    const { error } = await supabase.from(table).select("*", { count: "exact", head: true });
    if (error?.code === "42P01" || error?.message.includes("does not exist")) {
      missing.push(table);
    }
  }

  return missing;
}

export function migrationsHint(missing: RequiredTable[]): string {
  return `Missing tables: ${missing.join(", ")}. Apply supabase/migrations through 0024 (see STAGING_AUDIT.md).`;
}
