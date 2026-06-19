// ============================================================================
//  /portal/admin/accounting — Xero-backed income, expenses & P&L summary.
// ============================================================================

export const dynamic = "force-dynamic";

import nextDynamic from "next/dynamic";
import { requirePortalSession } from "@/lib/portal/session";
import { fetchAccountingSnapshot } from "@/lib/xero/accounting-data";
import { xeroRedirectUri } from "@/lib/xero/config";
import { resolveAppOriginFromHeaders } from "@/lib/xero/app-origin";

const AccountingDashboard = nextDynamic(
  () => import("@/components/admin/accounting/AccountingDashboard").then((m) => m.AccountingDashboard),
  {
    loading: () => (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    ),
  },
);

export default async function AccountingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; connected?: string }>;
}) {
  const { supabase, studioId } = await requirePortalSession();
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
