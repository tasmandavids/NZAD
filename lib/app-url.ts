const LOCAL_APP_URL = "http://localhost:3000";

function shouldUseWww(hostname: string): boolean {
  if (hostname === "localhost" || hostname.endsWith(".localhost")) return false;
  if (hostname.startsWith("www.")) return false;
  // Apex like olune.co.nz (3) or olune.app (2); studio subdomains like nzad.olune.co.nz (4+).
  return hostname.split(".").length < 4;
}

/** Ensure a full origin with protocol; apex domains use www for stable OAuth callbacks. */
function normalizeOrigin(url: string): string {
  let raw = url.trim().replace(/\/$/, "");
  if (!raw) return LOCAL_APP_URL;

  if (!/^https?:\/\//i.test(raw)) {
    raw = `https://${raw}`;
  }

  try {
    const parsed = new URL(raw);
    const { protocol, hostname, port } = parsed;

    if (hostname === "localhost" || hostname.endsWith(".localhost")) {
      return port ? `${protocol}//${hostname}:${port}` : `${protocol}//${hostname}`;
    }

    const host = shouldUseWww(hostname) ? `www.${hostname}` : hostname;
    const defaultPort = protocol === "https:" ? "443" : "80";
    const portSuffix = port && port !== defaultPort ? `:${port}` : "";
    return `${protocol}//${host}${portSuffix}`;
  } catch {
    return raw;
  }
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
    return normalizeOrigin(root);
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
