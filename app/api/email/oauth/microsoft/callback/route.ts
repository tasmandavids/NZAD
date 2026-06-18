import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encryptCredentials } from "@/lib/email/crypto";
import { verifyOAuthState } from "@/lib/email/oauth-state";
import { exchangeMicrosoftCode } from "@/lib/email/providers/microsoft";

export const runtime = "nodejs";

function appOrigin(req: NextRequest): string {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? req.nextUrl.origin;
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const oauthError = req.nextUrl.searchParams.get("error_description") ?? req.nextUrl.searchParams.get("error");
  const base = `${appOrigin(req)}/portal/admin/email`;

  if (!code || !state) {
    return NextResponse.redirect(new URL(`${base}?error=${encodeURIComponent(oauthError ?? "Authorization cancelled")}`, req.url));
  }

  const payload = verifyOAuthState(state);
  if (!payload || payload.provider !== "microsoft") {
    return NextResponse.redirect(new URL(`${base}?error=Invalid+OAuth+state`, req.url));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id !== payload.userId) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    const redirectUri = `${appOrigin(req)}/api/email/oauth/microsoft/callback`;
    const result = await exchangeMicrosoftCode(code, redirectUri);
    const { email, displayName, ...creds } = result;

    const { error } = await supabase.from("email_accounts").upsert(
      {
        studio_id: payload.studioId,
        provider: "microsoft",
        email_address: email.toLowerCase(),
        display_name: displayName,
        credentials_encrypted: encryptCredentials(creds),
        connected_by: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "studio_id,email_address" },
    );

    if (error) throw new Error(error.message);
    return NextResponse.redirect(new URL(`${base}?connected=microsoft`, req.url));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to connect Microsoft";
    return NextResponse.redirect(new URL(`${base}?error=${encodeURIComponent(msg)}`, req.url));
  }
}
