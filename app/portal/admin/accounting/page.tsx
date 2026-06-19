// ============================================================================
//  /portal/admin/accounting — Xero-backed income, expenses & P&L summary.
// ============================================================================

import { createClient } from "@/lib/supabase/server";
import { fetchAccountingSnapshot } from "@/lib/xero/accounting-data";
import { xeroRedirectUri } from "@/lib/xero/config";
import { resolveAppOriginFromHeaders } from "@/lib/xero/app-origin";
import { AccountingDashboard } from "@/components/admin/accounting/AccountingDashboard";

async function currentStudioId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data } = await supabase
    .from("profiles")
    .select("studio_id")
    .eq("id", user!.id)
    .single();
  return data?.studio_id as string;
}

export default async function AccountingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; connected?: string }>;
}) {
  const supabase = await createClient();
  const studioId = await currentStudioId(supabase);
  const origin = await resolveAppOriginFromHeaders();
  const redirectUri = xeroRedirectUri(origin);
  const snapshot = await fetchAccountingSnapshot(supabase, studioId, redirectUri);
  const params = await searchParams;

  return (
    <AccountingDashboard
      snapshot={snapshot}
      redirectUri={redirectUri}
      bannerError={params.error ?? null}
      bannerConnected={params.connected === "1"}
    />
  );
}
