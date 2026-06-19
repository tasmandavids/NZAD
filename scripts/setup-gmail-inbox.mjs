#!/usr/bin/env node
/**
 * Gmail inbox preflight — validates env and prints Google Cloud checklist.
 *
 * Usage: node --env-file=.env.local scripts/setup-gmail-inbox.mjs
 */

const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
const callback = `${appUrl}/api/email/oauth/google/callback`;

const clientId =
  process.env.GOOGLE_MAIL_CLIENT_ID ?? process.env.GOOGLE_OAUTH_CLIENT_ID;
const clientSecret =
  process.env.GOOGLE_MAIL_CLIENT_SECRET ?? process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const encryptionKey =
  process.env.EMAIL_TOKEN_ENCRYPTION_KEY ?? process.env.CRON_SECRET;

console.log("\n── Gmail inbox preflight ───────────────────────────────\n");

const checks = [
  ["Google OAuth client ID", Boolean(clientId)],
  ["Google OAuth client secret", Boolean(clientSecret)],
  ["EMAIL_TOKEN_ENCRYPTION_KEY (or CRON_SECRET)", Boolean(encryptionKey)],
  ["NEXT_PUBLIC_APP_URL", Boolean(process.env.NEXT_PUBLIC_APP_URL)],
];

let ok = true;
for (const [label, pass] of checks) {
  console.log(`  ${pass ? "✓" : "✗"} ${label}`);
  if (!pass) ok = false;
}

console.log("\n── Add these redirect URIs in Google Cloud ─────────────\n");
console.log("  Local:");
console.log(`  ${callback}\n`);
console.log("  Production:");
console.log(`  https://www.olune.co.nz/api/email/oauth/google/callback\n`);
console.log("── JavaScript origins (if prompted) ────────────────────\n");
console.log("  http://localhost:3000");
console.log("  https://www.olune.co.nz\n");

console.log("── Google Cloud checklist ──────────────────────────────\n");
console.log("  1. Enable Gmail API");
console.log("     https://console.cloud.google.com/apis/library/gmail.googleapis.com");
console.log("  2. OAuth consent → add scopes: gmail.readonly, gmail.send, gmail.modify");
console.log("     https://console.cloud.google.com/apis/credentials/consent");
console.log("  3. OAuth client → Authorized redirect URIs → paste callback above");
console.log("     https://console.cloud.google.com/apis/credentials");
console.log("  4. If app is in Testing → add your Gmail under Test users\n");

console.log("── Test in browser ─────────────────────────────────────\n");
console.log(`  1. npm run dev`);
console.log(`  2. Sign in as studio admin → ${appUrl}/portal/admin/email`);
console.log(`  3. Click Gmail → Connect with OAuth`);
console.log(`  4. Or open directly (after sign-in): ${appUrl}/api/email/oauth/google\n`);

if (!ok) {
  console.error("Fix missing env vars in .env.local (see .env.local.example).\n");
  process.exit(1);
}

console.log("Env looks good. Complete the Google Cloud steps above, then connect.\n");
