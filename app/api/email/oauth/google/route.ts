import { NextRequest, NextResponse } from "next/server";
import { getAdminEmailContext } from "@/lib/email/admin-context";
import { signOAuthState } from "@/lib/email/oauth-state";
import { gmailAuthUrl } from "@/lib/email/providers/gmail";

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
    const redirectUri = `${appOrigin(req)}/api/email/oauth/google/callback`;
    const state = signOAuthState({
      studioId: ctx.studioId,
      userId: ctx.userId,
      provider: "gmail",
      exp: Date.now() + 10 * 60 * 1000,
    });
    const url = gmailAuthUrl(redirectUri, state);
    return NextResponse.redirect(url);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "OAuth not configured";
    return NextResponse.redirect(new URL(`/portal/admin/email?error=${encodeURIComponent(msg)}`, req.url));
  }
}
