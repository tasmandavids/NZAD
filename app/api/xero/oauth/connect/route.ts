import { NextRequest, NextResponse } from "next/server";
import { getAdminXeroContext } from "@/lib/xero/admin-context";
import { createBareXeroClient } from "@/lib/xero/client";
import { isXeroConfigured, xeroRedirectUri } from "@/lib/xero/config";
import { signXeroOAuthState } from "@/lib/xero/oauth-state";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const ctx = await getAdminXeroContext();
  if (ctx.error) {
    return NextResponse.redirect(new URL("/login?next=/portal/admin/accounting", req.url));
  }

  if (!isXeroConfigured()) {
    return NextResponse.redirect(
      new URL("/portal/admin/accounting?error=Xero+is+not+configured", req.url),
    );
  }

  try {
    const redirectUri = xeroRedirectUri();
    const state = signXeroOAuthState({
      studioId: ctx.studioId,
      userId: ctx.userId,
      exp: Date.now() + 10 * 60 * 1000,
    });
    const client = createBareXeroClient(redirectUri, state);
    await client.initialize();
    const url = await client.buildConsentUrl();
    return NextResponse.redirect(url);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "OAuth not configured";
    return NextResponse.redirect(new URL(`/portal/admin/accounting?error=${encodeURIComponent(msg)}`, req.url));
  }
}
