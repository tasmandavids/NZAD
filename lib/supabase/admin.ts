// Service-role Supabase client — bypasses RLS.
//
// Use ONLY in trusted server-side contexts that run without a signed-in user:
// webhook handlers and cron jobs. Never import this into a Server Component or
// any code path reachable by an end user request, and never expose the key to
// the browser.
//
// Requires env: SUPABASE_SERVICE_ROLE_KEY (Supabase → Settings → API).

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");

  return createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
