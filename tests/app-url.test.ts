import { afterEach, describe, expect, it } from "vitest";
import {
  canonicalAppUrl,
  emailGoogleOAuthCallbackUrl,
  xeroOAuthCallbackUrl,
} from "@/lib/app-url";

describe("canonicalAppUrl", () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
  });

  it("prefers NEXT_PUBLIC_APP_URL when set", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://www.olune.co.nz/";
    delete process.env.NEXT_PUBLIC_ROOT_DOMAIN;
    expect(canonicalAppUrl()).toBe("https://www.olune.co.nz");
  });

  it("derives from NEXT_PUBLIC_ROOT_DOMAIN in production", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_ROOT_DOMAIN = "olune.co.nz";
    expect(canonicalAppUrl()).toBe("https://www.olune.co.nz");
  });

  it("adds https and www when APP_URL is a bare domain", () => {
    process.env.NEXT_PUBLIC_APP_URL = "olune.co.nz";
    expect(canonicalAppUrl()).toBe("https://www.olune.co.nz");
    expect(emailGoogleOAuthCallbackUrl()).toBe(
      "https://www.olune.co.nz/api/email/oauth/google/callback",
    );
  });
});
