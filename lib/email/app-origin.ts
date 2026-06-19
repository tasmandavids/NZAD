import type { NextRequest } from "next/server";
import { canonicalAppUrl } from "@/lib/app-url";

/**
 * Origin used for OAuth redirect_uri — must exactly match what Google/Microsoft
 * will redirect back to, and what we send on token exchange.
 */
export function resolveAppOrigin(req: NextRequest): string {
  // Local dev: match the browser origin (localhost vs 127.0.0.1, port, etc.)
  if (process.env.NODE_ENV === "development") {
    return req.nextUrl.origin;
  }

  return canonicalAppUrl();
}
