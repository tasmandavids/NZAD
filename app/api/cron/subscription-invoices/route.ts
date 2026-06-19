import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runSubscriptionInvoicesForStudio } from "@/lib/subscriptions/cron-run";

export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const header = req.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;
  if (req.nextUrl.searchParams.get("secret") === secret) return true;
  return false;
}

function localYmd(timezone: string, base = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(base);
    const m: Record<string, string> = {};
    for (const p of parts) m[p.type] = p.value;
    return `${m.year}-${m.month}-${m.day}`;
  } catch {
    return base.toISOString().slice(0, 10);
  }
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Admin client unavailable" },
      { status: 500 },
    );
  }

  const { data: studios } = await supabase.from("studios").select("id, timezone");
  const results: Record<string, unknown> = {};

  for (const studio of studios ?? []) {
    const tz = (studio.timezone as string | null) || "Pacific/Auckland";
    const ymd = localYmd(tz);
    const day = Number(ymd.slice(8, 10));
    if (day !== 1) {
      results[studio.id as string] = { skipped: true, reason: "not_first_of_month", localDate: ymd };
      continue;
    }

    const billingMonth = ymd.slice(0, 7);
    const outcome = await runSubscriptionInvoicesForStudio(supabase, studio.id as string, billingMonth);
    results[studio.id as string] = { billingMonth, ...outcome };
  }

  return NextResponse.json({ ok: true, results });
}
