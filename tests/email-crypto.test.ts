import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { encryptCredentials, decryptCredentials } from "@/lib/email/crypto";

describe("email crypto", () => {
  const prev = process.env.EMAIL_TOKEN_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.EMAIL_TOKEN_ENCRYPTION_KEY = "test-secret-key-for-email-crypto";
  });

  afterEach(() => {
    process.env.EMAIL_TOKEN_ENCRYPTION_KEY = prev;
  });

  it("round-trips oauth credentials", () => {
    const creds = {
      kind: "oauth" as const,
      accessToken: "access-123",
      refreshToken: "refresh-456",
      expiresAt: Date.now() + 3600_000,
    };
    const blob = encryptCredentials(creds);
    expect(decryptCredentials(blob)).toEqual(creds);
  });

  it("round-trips imap credentials", () => {
    const creds = {
      kind: "imap" as const,
      email: "user@icloud.com",
      password: "app-password",
      imapHost: "imap.mail.me.com",
      imapPort: 993,
      smtpHost: "smtp.mail.me.com",
      smtpPort: 587,
    };
    const blob = encryptCredentials(creds);
    expect(decryptCredentials(blob)).toEqual(creds);
  });
});
