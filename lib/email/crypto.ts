import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { EmailCredentials } from "./types";

const ALGO = "aes-256-gcm";

function encryptionKey(): Buffer {
  const secret = process.env.EMAIL_TOKEN_ENCRYPTION_KEY ?? process.env.CRON_SECRET;
  if (!secret) {
    throw new Error("EMAIL_TOKEN_ENCRYPTION_KEY (or CRON_SECRET) is required for email credentials");
  }
  return createHash("sha256").update(secret).digest();
}

export function encryptCredentials(credentials: EmailCredentials): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, encryptionKey(), iv);
  const payload = Buffer.from(JSON.stringify(credentials), "utf8");
  const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptCredentials(blob: string): EmailCredentials {
  const raw = Buffer.from(blob, "base64");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const encrypted = raw.subarray(28);
  const decipher = createDecipheriv(ALGO, encryptionKey(), iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return JSON.parse(decrypted.toString("utf8")) as EmailCredentials;
}
