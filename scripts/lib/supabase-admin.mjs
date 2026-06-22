import { createClient } from "@supabase/supabase-js";
import ws from "ws";

/** Service-role client for Node admin scripts (Auth + REST; ws transport for older runtimes). */
export function createServiceClient(url, serviceKey) {
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: ws },
  });
}
