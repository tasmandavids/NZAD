import type { EmailProvider } from "./types";

export function oauthConnectPath(provider: Extract<EmailProvider, "gmail" | "microsoft">): string {
  return `/api/email/oauth/${provider}`;
}
