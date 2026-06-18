import { NextRequest, NextResponse } from "next/server";
import { getAdminEmailContext } from "@/lib/email/admin-context";
import { signOAuthState } from "@/lib/email/oauth-state";
import { microsoftAuthUrl } from "@/lib/email/providers/microsoft";

export const runtime = "nodejs";

function appOrigin(req: NextRequest): string {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? req.nextUrl.origin;
}

export async function GET(req: NextRequest) {
  const ctx = await getAdminEmailContext();
  if (ctx.error) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    const redirectUri = `${appOrigin(req)}/api/email/oauth/microsoft/callback`;
    const state = signOAuthState({
      studioId: ctx.studioId,
      userId: ctx.userId,
      provider: "microsoft",
      exp: Date.now() + 10 * 60 * 1000,
    });
    return NextResponse.redirect(microsoftAuthUrl(redirectUri, state));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "OAuth not configured";
    return NextResponse.redirect(new URL(`/portal/admin/email?error=${encodeURIComponent(msg)}`, req.url));
  }
}
