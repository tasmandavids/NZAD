import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { XeroTokenSet } from "./types";

const ALGO = "aes-256-gcm";

function encryptionKey(): Buffer {
  const secret =
    process.env.XERO_TOKEN_ENCRYPTION_KEY ??
    process.env.EMAIL_TOKEN_ENCRYPTION_KEY ??
    process.env.CRON_SECRET;
  if (!secret) {
    throw new Error("XERO_TOKEN_ENCRYPTION_KEY (or EMAIL_TOKEN_ENCRYPTION_KEY / CRON_SECRET) is required");
  }
  return createHash("sha256").update(secret).digest();
}

export function encryptTokenSet(tokens: XeroTokenSet): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, encryptionKey(), iv);
  const payload = Buffer.from(JSON.stringify(tokens), "utf8");
  const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptTokenSet(blob: string): XeroTokenSet {
  const raw = Buffer.from(blob, "base64");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const encrypted = raw.subarray(28);
  const decipher = createDecipheriv(ALGO, encryptionKey(), iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return JSON.parse(decrypted.toString("utf8")) as XeroTokenSet;
}
