import type { NextRequest } from "next/server";

/** Authorize Vercel Cron / manual cron invocations. Query-string secrets are dev-only. */
export function authorizedCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";

  const header = req.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;

  if (process.env.NODE_ENV !== "production") {
    if (req.nextUrl.searchParams.get("secret") === secret) return true;
  }
  return false;
}
