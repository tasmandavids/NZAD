// ============================================================================
//  lib/notify/providers.ts
//
//  Thin IO wrappers around Resend (email) + Twilio (SMS), both via their REST
//  APIs using `fetch` — no SDK dependencies. Each call returns a discriminated
//  result; when the provider isn't configured it returns `{ skipped: true }`
//  rather than throwing, so the delivery cron degrades gracefully in any
//  environment that hasn't set the keys.
//
//  Server-only. Never import into client components.
// ============================================================================

import { getEmailConfig, getSmsConfig } from "./config";

export type SendResult =
  | { ok: true; skipped?: false; id?: string }
  | { ok: false; skipped: true } // provider not configured — no-op
  | { ok: false; skipped?: false; error: string };

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<SendResult> {
  const cfg = getEmailConfig();
  if (!cfg) return { ok: false, skipped: true };
  if (!params.to) return { ok: false, error: "missing recipient email" };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: cfg.from,
        to: [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return { ok: false, error: `resend ${res.status}: ${detail.slice(0, 200)}` };
    }
    const json = (await res.json().catch(() => ({}))) as { id?: string };
    return { ok: true, id: json.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "email send failed" };
  }
}

export async function sendSms(params: { to: string; body: string }): Promise<SendResult> {
  const cfg = getSmsConfig();
  if (!cfg) return { ok: false, skipped: true };
  if (!params.to) return { ok: false, error: "missing recipient phone" };

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${cfg.accountSid}/Messages.json`;
    const form = new URLSearchParams({ To: params.to, From: cfg.from, Body: params.body });
    const auth = Buffer.from(`${cfg.accountSid}:${cfg.authToken}`).toString("base64");
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return { ok: false, error: `twilio ${res.status}: ${detail.slice(0, 200)}` };
    }
    const json = (await res.json().catch(() => ({}))) as { sid?: string };
    return { ok: true, id: json.sid };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "sms send failed" };
  }
}
