import type { EmailProvider } from "./types";

const OAUTH_ROUTE: Record<Extract<EmailProvider, "gmail" | "microsoft">, string> = {
  gmail: "google",
  microsoft: "microsoft",
};

export function oauthConnectPath(provider: Extract<EmailProvider, "gmail" | "microsoft">): string {
  return `/api/email/oauth/${OAUTH_ROUTE[provider]}`;
}
