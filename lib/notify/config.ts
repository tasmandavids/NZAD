// ============================================================================
//  lib/notify/config.ts
//
//  Env-driven configuration for outbound notification delivery (email + SMS).
//  Keep this the single place that reads delivery env vars so the providers and
//  the cron route agree on what "configured" means. When a provider's keys are
//  unset the delivery layer no-ops gracefully (the in-app notification row is
//  still created by the DB triggers / cron — only the external send is skipped).
// ============================================================================

export type EmailConfig = {
  apiKey: string;
  /** "Studio Name <noreply@domain>" or a bare address. */
  from: string;
};

export type SmsConfig = {
  accountSid: string;
  authToken: string;
  /** E.164 sender number, e.g. +6421234567. */
  from: string;
};

export function getEmailConfig(): EmailConfig | null {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) return null;
  return { apiKey, from };
}

export function getSmsConfig(): SmsConfig | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  if (!accountSid || !authToken || !from) return null;
  return { accountSid, authToken, from };
}

export function isEmailConfigured(): boolean {
  return getEmailConfig() !== null;
}

export function isSmsConfigured(): boolean {
  return getSmsConfig() !== null;
}
