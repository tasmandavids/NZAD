import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncStudioAccounts } from "@/lib/email/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const auth = req.headers.get("authorization");
  const query = req.nextUrl.searchParams.get("secret");
  return auth === `Bearer ${secret}` || query === secret;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const studioId = req.nextUrl.searchParams.get("studioId");

  if (studioId) {
    const result = await syncStudioAccounts(supabase, studioId);
    return NextResponse.json(result);
  }

  const { data: studios } = await supabase.from("email_accounts").select("studio_id");
  const ids = [...new Set((studios ?? []).map((s) => s.studio_id as string))];
  let synced = 0;
  const errors: string[] = [];
  for (const id of ids) {
    const result = await syncStudioAccounts(supabase, id);
    synced += result.synced;
    errors.push(...result.errors);
  }
  return NextResponse.json({ studios: ids.length, synced, errors });
}
