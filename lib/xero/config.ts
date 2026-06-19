import { XERO_SCOPES } from "./types";

export function xeroClientId(): string {
  const id = process.env.XERO_CLIENT_ID;
  if (!id) throw new Error("XERO_CLIENT_ID is not configured");
  return id;
}

export function xeroClientSecret(): string {
  const secret = process.env.XERO_CLIENT_SECRET;
  if (!secret) throw new Error("XERO_CLIENT_SECRET is not configured");
  return secret;
}

/** Canonical OAuth callback — never use tenant subdomains (e.g. slug.localhost). */
export function xeroRedirectUri(_origin?: string): string {
  if (process.env.XERO_REDIRECT_URI) return process.env.XERO_REDIRECT_URI.replace(/\/$/, "");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (appUrl) return `${appUrl}/api/xero/oauth/callback`;
  if (_origin) return `${_origin.replace(/\/$/, "")}/api/xero/oauth/callback`;
  return "http://localhost:3000/api/xero/oauth/callback";
}

/** Used by webhooks/cron where no request origin is available. */
export function xeroRedirectUriForJobs(): string {
  if (process.env.XERO_REDIRECT_URI) return process.env.XERO_REDIRECT_URI;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (appUrl) return `${appUrl}/api/xero/oauth/callback`;
  return "http://localhost:3000/api/xero/oauth/callback";
}

export function isXeroConfigured(): boolean {
  return Boolean(process.env.XERO_CLIENT_ID && process.env.XERO_CLIENT_SECRET);
}

export { XERO_SCOPES };
