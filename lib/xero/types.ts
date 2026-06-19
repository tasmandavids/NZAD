export type XeroConnectionSettings = {
  sync_enabled?: boolean;
  sales_account_code?: string;
  payment_account_code?: string;
};

export type XeroConnectionRow = {
  id: string;
  studio_id: string;
  tenant_id: string;
  tenant_name: string;
  org_short_code: string | null;
  credentials_encrypted: string;
  connected_by: string | null;
  last_sync_at: string | null;
  sync_error: string | null;
  settings: XeroConnectionSettings;
  created_at: string;
  updated_at: string;
};

export type XeroTokenSet = {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  token_type?: string;
  scope?: string | string[];
  id_token?: string;
};

export type XeroSyncSourceType = "invoice" | "order" | "ticket";

export type MonthlyPlPoint = {
  month: string;
  incomeCents: number;
  expenseCents: number;
};

export type PlSummary = {
  incomeMtdCents: number;
  incomeYtdCents: number;
  expenseMtdCents: number;
  expenseYtdCents: number;
  netMtdCents: number;
  netYtdCents: number;
  monthlySeries: MonthlyPlPoint[];
};

export type XeroActivityRow = {
  id: string;
  type: "invoice" | "bank";
  reference: string;
  contactName: string | null;
  amountCents: number;
  date: string;
  status: string | null;
};

export const DEFAULT_XERO_SETTINGS: XeroConnectionSettings = {
  sync_enabled: true,
  sales_account_code: "200",
  payment_account_code: "090",
};

/**
 * Granular scopes required for apps created after 2 Mar 2026.
 * Broad accounting.transactions / accounting.reports.read are rejected for new apps.
 */
export const XERO_SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
  "accounting.contacts",
  "accounting.invoices",
  "accounting.invoices.read",
  "accounting.payments",
  "accounting.reports.profitandloss.read",
  "accounting.settings.read",
];
