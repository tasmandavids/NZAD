import { createClient } from "@supabase/supabase-js";
import ws from "ws";

/** Service-role client for Node scripts (Auth + REST only; ws transport for Node < 22). */
export function createServiceClient(url, serviceKey) {
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: ws },
  });
}
