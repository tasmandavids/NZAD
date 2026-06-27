#!/usr/bin/env node
/**
 * Configure Supabase Auth for Google OAuth.
 *
 * Usage:
 *   node --env-file=.env.local scripts/setup-oauth.mjs
 *   node --env-file=.env.local scripts/setup-oauth.mjs --enable-google
 *
 * Optional env vars for provider credentials:
 *   GOOGLE_OAUTH_CLIENT_ID
 *   GOOGLE_OAUTH_CLIENT_SECRET
 */

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF ?? "wnoxcwihrzbxvogvmhqv";
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

if (!TOKEN) {
  console.error("Missing SUPABASE_ACCESS_TOKEN in environment (.env.local).");
  console.error("Create one at https://supabase.com/dashboard/account/tokens");
  process.exit(1);
}

const args = new Set(process.argv.slice(2));
const enableGoogle = args.has("--enable-google") || Boolean(process.env.GOOGLE_OAUTH_CLIENT_ID);

function callbackUrls() {
  const urls = new Set([
    "http://localhost:3000/auth/callback",
    "http://127.0.0.1:3000/auth/callback",
    "https://127.0.0.1:3000/auth/callback",
  ]);

  if (APP_URL) {
    urls.add(`${APP_URL.replace(/\/$/, "")}/auth/callback`);
  }

  // Production domains (always allow — safe to merge)
  for (const host of ["olune.co.nz", "www.olune.co.nz", "olune.app", "www.olune.app"]) {
    urls.add(`https://${host}/auth/callback`);
  }

  if (ROOT && ROOT !== "localhost") {
    urls.add(`https://${ROOT}/auth/callback`);
    urls.add(`https://www.${ROOT}/auth/callback`);
  }

  return [...urls];
}

async function api(path, init = {}) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`${init.method ?? "GET"} ${path} failed (${res.status}): ${JSON.stringify(body)}`);
  }
  return body;
}

async function main() {
  const current = await api("/config/auth");
  const existing = (current.uri_allow_list ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const merged = [...new Set([...existing, ...callbackUrls()])];
  const productionSite =
    process.env.SUPABASE_SITE_URL?.replace(/\/$/, "") ||
    (APP_URL && !APP_URL.includes("localhost") ? APP_URL.replace(/\/$/, "") : null) ||
    "https://www.olune.co.nz";
  const patch = {
    site_url: productionSite,
    uri_allow_list: merged.join(","),
  };

  if (enableGoogle) {
    const id = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const secret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    if (!id || !secret) {
      console.error("Google enable requested but GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET missing.");
      process.exit(1);
    }
    patch.external_google_enabled = true;
    patch.external_google_client_id = id;
    patch.external_google_secret = secret;
    patch.external_google_skip_nonce_check = false;
  }

  const updated = await api("/config/auth", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });

  console.log("\n✓ Supabase auth config updated\n");
  console.log("Site URL:", updated.site_url);
  console.log("Redirect URLs:");
  for (const url of (updated.uri_allow_list ?? "").split(",").filter(Boolean)) {
    console.log("  •", url.trim());
  }
  console.log("\nProviders:");
  console.log("  Google:", updated.external_google_enabled ? "enabled" : "disabled");

  const supabaseCallback = `https://${PROJECT_REF}.supabase.co/auth/v1/callback`;
  console.log("\n── Provider console setup ──────────────────────────────");
  console.log("\nUse this redirect URI in Google Cloud Console:");
  console.log(" ", supabaseCallback);
  console.log("\nGoogle Cloud Console → APIs & Services → Credentials → OAuth client:");
  console.log("  https://console.cloud.google.com/apis/credentials");
  const origins = ["http://localhost:3000"];
  if (APP_URL) origins.push(APP_URL.replace(/\/$/, ""));
  else if (ROOT && ROOT !== "localhost") {
    origins.push(`https://${ROOT}`, `https://www.${ROOT}`);
  }
  console.log("  Authorized JavaScript origins:");
  for (const o of origins) console.log("   ", o);
  console.log("  Authorized redirect URIs:", supabaseCallback);
  console.log("\nSupabase provider settings:");
  console.log(`  https://supabase.com/dashboard/project/${PROJECT_REF}/auth/providers`);

  if (!updated.external_google_enabled) {
    console.log("\nTo enable Google once credentials are in .env.local, run:");
    console.log("  node --env-file=.env.local scripts/setup-oauth.mjs --enable-google");
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
