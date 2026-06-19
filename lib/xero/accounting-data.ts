import type { SupabaseClient } from "@supabase/supabase-js";
import { loadStudioXeroClient } from "./client";
import { xeroErrorMessage } from "./errors";
import { mapRecentInvoices, parseProfitAndLossReport } from "./reports";
import type { PlSummary, XeroActivityRow, XeroConnectionRow } from "./types";

export type AccountingSnapshot = {
  connected: boolean;
  configured: boolean;
  connection: Pick<
    XeroConnectionRow,
    "tenant_name" | "org_short_code" | "last_sync_at" | "sync_error" | "settings"
  > | null;
  summary: PlSummary | null;
  activity: XeroActivityRow[];
  fetchError: string | null;
};

function emptySummary(): PlSummary {
  return {
    incomeMtdCents: 0,
    incomeYtdCents: 0,
    expenseMtdCents: 0,
    expenseYtdCents: 0,
    netMtdCents: 0,
    netYtdCents: 0,
    monthlySeries: [],
  };
}

export async function fetchAccountingSnapshot(
  supabase: SupabaseClient,
  studioId: string,
  redirectUri: string,
): Promise<AccountingSnapshot> {
  const configured = Boolean(process.env.XERO_CLIENT_ID && process.env.XERO_CLIENT_SECRET);

  const { data: connection } = await supabase
    .from("xero_connections")
    .select("tenant_name, org_short_code, last_sync_at, sync_error, settings")
    .eq("studio_id", studioId)
    .maybeSingle();

  if (!connection) {
    return {
      connected: false,
      configured,
      connection: null,
      summary: null,
      activity: [],
      fetchError: null,
    };
  }

  const loaded = await loadStudioXeroClient(supabase, studioId, redirectUri);
  if (!loaded) {
    return {
      connected: false,
      configured,
      connection,
      summary: null,
      activity: [],
      fetchError: "Could not load Xero connection.",
    };
  }

  const errors: string[] = [];
  const yearStart = `${new Date().getFullYear()}-01-01`;
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 7)}-01`;

  let monthlySeries = emptySummary();
  let ytdSummary = emptySummary();
  let mtdSummary = emptySummary();
  let activity: XeroActivityRow[] = [];

  try {
    // Xero allows max 11 comparison periods (= 12 monthly columns incl. current month).
    const monthlyPl = await loaded.client.accountingApi.getReportProfitAndLoss(
      loaded.tenantId,
      monthStart,
      today,
      11,
      "MONTH",
      undefined,
      undefined,
      undefined,
      undefined,
      true,
    );
    monthlySeries = parseProfitAndLossReport(monthlyPl.body.reports?.[0]);
  } catch (err) {
    errors.push(`P&L chart: ${xeroErrorMessage(err)}`);
  }

  try {
    const ytdPl = await loaded.client.accountingApi.getReportProfitAndLoss(
      loaded.tenantId,
      yearStart,
      today,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      true,
    );
    ytdSummary = parseProfitAndLossReport(ytdPl.body.reports?.[0]);
  } catch (err) {
    errors.push(`P&L year: ${xeroErrorMessage(err)}`);
  }

  try {
    const mtdPl = await loaded.client.accountingApi.getReportProfitAndLoss(
      loaded.tenantId,
      monthStart,
      today,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      true,
    );
    mtdSummary = parseProfitAndLossReport(mtdPl.body.reports?.[0]);
  } catch (err) {
    errors.push(`P&L month: ${xeroErrorMessage(err)}`);
  }

  try {
    const invoicesRes = await loaded.client.accountingApi.getInvoices(
      loaded.tenantId,
      undefined,
      undefined,
      "UpdatedDateUTC DESC",
      undefined,
      undefined,
      undefined,
      undefined,
      1,
      undefined,
      undefined,
      undefined,
      undefined,
      10,
    );
    activity = mapRecentInvoices(invoicesRes.body.invoices);
  } catch (err) {
    errors.push(`Invoices: ${xeroErrorMessage(err)}`);
  }

  const summary: PlSummary = {
    incomeMtdCents: mtdSummary.incomeMtdCents || monthlySeries.incomeMtdCents,
    expenseMtdCents: mtdSummary.expenseMtdCents || monthlySeries.expenseMtdCents,
    netMtdCents: mtdSummary.netMtdCents || monthlySeries.netMtdCents,
    incomeYtdCents: ytdSummary.incomeYtdCents,
    expenseYtdCents: ytdSummary.expenseYtdCents,
    netYtdCents: ytdSummary.netYtdCents,
    monthlySeries: monthlySeries.monthlySeries,
  };

  const fetchError = errors.length ? errors.join(" · ") : null;

  await supabase
    .from("xero_connections")
    .update({
      last_sync_at: new Date().toISOString(),
      sync_error: fetchError,
    })
    .eq("studio_id", studioId);

  return {
    connected: true,
    configured,
    connection: { ...connection, sync_error: fetchError },
    summary,
    activity,
    fetchError,
  };
}
