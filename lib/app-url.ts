const LOCAL_APP_URL = "http://localhost:3000";

function normalizeOrigin(url: string): string {
  return url.replace(/\/$/, "");
}

/**
 * Canonical app origin for OAuth callbacks, token refresh, cron jobs, and
 * notification links. OAuth providers require a single stable URL — not studio
 * subdomains like nzad.olune.co.nz.
 */
export function canonicalAppUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return normalizeOrigin(explicit);

  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.replace(/^www\./, "").trim();
  if (root && root !== "localhost") {
    return `https://www.${root}`;
  }

  return LOCAL_APP_URL;
}

export function emailGoogleOAuthCallbackUrl(): string {
  return `${canonicalAppUrl()}/api/email/oauth/google/callback`;
}

export function emailMicrosoftOAuthCallbackUrl(): string {
  return `${canonicalAppUrl()}/api/email/oauth/microsoft/callback`;
}

export function xeroOAuthCallbackUrl(): string {
  const explicit = process.env.XERO_REDIRECT_URI?.trim();
  if (explicit) return normalizeOrigin(explicit);
  return `${canonicalAppUrl()}/api/xero/oauth/callback`;
}
