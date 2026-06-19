import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizedCron } from "@/lib/cron/auth";
import { syncStudioAccounts } from "@/lib/email/sync";
import { isUuid } from "@/lib/validation/uuid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!authorizedCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const studioId = req.nextUrl.searchParams.get("studioId");

  if (studioId && !isUuid(studioId)) {
    return NextResponse.json({ error: "Invalid studio id" }, { status: 400 });
  }

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
