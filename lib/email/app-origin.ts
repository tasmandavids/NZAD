import type { NextRequest } from "next/server";

/**
 * Origin used for OAuth redirect_uri — must exactly match what Google/Microsoft
 * will redirect back to, and what we send on token exchange.
 */
export function resolveAppOrigin(req: NextRequest): string {
  const requestOrigin = req.nextUrl.origin;

  // Local dev: always use the browser's origin (localhost vs 127.0.0.1, port, etc.)
  if (process.env.NODE_ENV === "development") {
    return requestOrigin;
  }

  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (!configured) return requestOrigin;

  try {
    const configuredHost = new URL(configured).host;
    // www vs apex: if hosts differ only by www, prefer the live request origin
    const stripWww = (h: string) => h.replace(/^www\./, "");
    if (stripWww(configuredHost) === stripWww(req.nextUrl.host)) {
      return requestOrigin;
    }
  } catch {
    /* ignore */
  }

  return configured;
}
