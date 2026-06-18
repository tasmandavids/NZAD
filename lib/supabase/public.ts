// Cookieless Supabase client for public reads (tenant resolution, branding,
// published site pages). Avoids parsing stale auth cookies on marketing routes.

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createPublicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
