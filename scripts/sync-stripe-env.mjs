#!/usr/bin/env node
/**
 * Ensure Stripe webhook endpoint exists and print env sync instructions.
 * Usage: node --env-file=.env.local scripts/sync-stripe-env.mjs
 */
import Stripe from "stripe";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env.local");

const WEBHOOK_EVENTS = [
  "payment_intent.succeeded",
  "invoice.paid",
  "invoice.payment_failed",
  "charge.refunded",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
];

const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://www.olune.co.nz").replace(/\/$/, "");
const webhookUrl = `${appUrl}/api/webhooks/stripe`;

const sk = process.env.STRIPE_SECRET_KEY?.trim();
const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();

if (!sk || sk.includes("sk_test_...") || sk.startsWith("sk_test_")) {
  console.error("Set STRIPE_SECRET_KEY in .env.local (live or test secret key).");
  process.exit(1);
}
if (!pk || pk.includes("pk_test_...")) {
  console.error("Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in .env.local.");
  process.exit(1);
}

const stripe = new Stripe(sk);

const listed = await stripe.webhookEndpoints.list({ limit: 100 });
let endpoint = listed.data.find((e) => e.url === webhookUrl);
let webhookSecret = null;

if (endpoint) {
  console.log(`Webhook already exists: ${endpoint.id} → ${webhookUrl}`);
  const current = new Set(endpoint.enabled_events ?? []);
  const missing = WEBHOOK_EVENTS.filter((ev) => !current.has(ev));
  if (missing.length) {
    endpoint = await stripe.webhookEndpoints.update(endpoint.id, {
      enabled_events: [...new Set([...endpoint.enabled_events, ...WEBHOOK_EVENTS])],
    });
    console.log(`Updated enabled events (+${missing.length}).`);
  }
} else {
  endpoint = await stripe.webhookEndpoints.create({
    url: webhookUrl,
    enabled_events: WEBHOOK_EVENTS,
    description: "Olune production — invoices, shop, events, subscriptions",
  });
  webhookSecret = endpoint.secret;
  console.log(`Created webhook: ${endpoint.id} → ${webhookUrl}`);
}

if (webhookSecret) {
  let envText = readFileSync(envPath, "utf8");
  if (/^STRIPE_WEBHOOK_SECRET=.*/m.test(envText)) {
    envText = envText.replace(/^STRIPE_WEBHOOK_SECRET=.*/m, `STRIPE_WEBHOOK_SECRET=${webhookSecret}`);
  } else {
    envText += `\nSTRIPE_WEBHOOK_SECRET=${webhookSecret}\n`;
  }
  writeFileSync(envPath, envText);
  console.log("Updated STRIPE_WEBHOOK_SECRET in .env.local");
} else {
  console.log(
    "Webhook secret not returned (endpoint already existed). Reveal it in Stripe Dashboard → Developers → Webhooks → Signing secret, or delete the endpoint and re-run this script.",
  );
}

const vercelEnvs = ["production", "preview", "development"];
for (const name of ["STRIPE_SECRET_KEY", "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "STRIPE_WEBHOOK_SECRET"]) {
  let value = process.env[name]?.trim();
  if (name === "STRIPE_WEBHOOK_SECRET" && webhookSecret) value = webhookSecret;
  if (!value || value === "whsec_...") {
    if (name === "STRIPE_WEBHOOK_SECRET") continue;
    console.warn(`Skipping Vercel sync for ${name} — not set.`);
    continue;
  }
  for (const target of vercelEnvs) {
    const r = spawnSync(
      "npx",
      ["vercel@latest", "env", "add", name, target, "--scope", "olune", "--force", "--yes"],
      { cwd: root, input: value, encoding: "utf8" },
    );
    if (r.status === 0) {
      console.log(`Vercel ${target}: ${name} set`);
    } else {
      console.warn(`Vercel ${target}: ${name} failed — ${(r.stderr || r.stdout || "").trim()}`);
    }
  }
}

console.log("\nDone. Redeploy Vercel (or push to main) so production picks up new env vars.");
