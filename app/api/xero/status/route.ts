import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isXeroConfigured } from "@/lib/xero/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lightweight health check — confirms Xero env vars are visible at runtime (no secrets). */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = process.env.XERO_CLIENT_ID?.trim();
  const secret = process.env.XERO_CLIENT_SECRET?.trim();
  return NextResponse.json({
    configured: isXeroConfigured(),
    hasClientId: Boolean(id),
    hasClientSecret: Boolean(secret),
    clientIdLength: id?.length ?? 0,
  });
}
