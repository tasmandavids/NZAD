import { createHmac, timingSafeEqual } from "node:crypto";
import { requireSecret } from "@/lib/env/required-secret";

function secret(): string {
  return requireSecret(
    "XERO_OAUTH_STATE_SECRET",
    process.env.EMAIL_OAUTH_STATE_SECRET ?? process.env.CRON_SECRET,
  );
}

export type XeroOAuthStatePayload = {
  studioId: string;
  userId: string;
  exp: number;
};

export function signXeroOAuthState(payload: XeroOAuthStatePayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyXeroOAuthState(token: string): XeroOAuthStatePayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as XeroOAuthStatePayload;
  if (payload.exp < Date.now()) return null;
  return payload;
}
