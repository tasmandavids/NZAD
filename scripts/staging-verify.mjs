#!/usr/bin/env node
/**
 * Read-only staging / production verification for Olune.
 * Usage: node --env-file=.env.local scripts/staging-verify.mjs
 *
 * Checks: unit tests, typecheck, lint, migration sync, env vars,
 * optional Supabase SQL probes (when CLI is linked).
 */

import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PROJECT_REF = "wnoxcwihrzbxvogvmhqv";

const REQUIRED_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_ROOT_DOMAIN",
  "NEXT_PUBLIC_APP_URL",
  "CRON_SECRET",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
];

const OPTIONAL_ENV = [
  "RESEND_API_KEY",
  "RESEND_FROM",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_FROM",
  "PLATFORM_OPERATOR_EMAILS",
];

function isPlaceholder(value) {
  if (!value || value.trim().length < 8) return true;
  return /YOUR|^\.\.\.$|sk_test_\.\.\.|pk_test_\.\.\.|whsec_\.\.\.|re_\.\.\.|AC\.\.\./i.test(
    value.trim(),
  );
}

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    cwd: root,
    encoding: "utf8",
    shell: false,
    ...opts,
  });
  return { ok: r.status === 0, stdout: r.stdout ?? "", stderr: r.stderr ?? "", status: r.status };
}

function section(title) {
  console.log(`\n## ${title}`);
}

function pass(msg) {
  console.log(`  ✓ ${msg}`);
}

function fail(msg) {
  console.log(`  ✗ ${msg}`);
}

function warn(msg) {
  console.log(`  ⚠ ${msg}`);
}

console.log("Olune staging verification");
console.log(`Project: ${PROJECT_REF}`);
console.log(`Time: ${new Date().toISOString()}`);

section("Phase 0 — Automated baseline");
for (const [label, args] of [
  ["npm test", ["npm", "test"]],
  ["npm run typecheck", ["npm", "run", "typecheck"]],
  ["npm run lint", ["npm", "run", "lint"]],
]) {
  const r = run(args[0], args.slice(1));
  if (r.ok) pass(label);
  else {
    fail(label);
    if (r.stderr) console.log(r.stderr.slice(0, 500));
  }
}

section("Phase 1a — Migration sync (supabase migration list)");
const mig = run("npx", ["supabase", "migration", "list"], { timeout: 120_000 });
if (!mig.ok) {
  fail("Could not run supabase migration list (link CLI or check network)");
  if (mig.stderr) console.log(mig.stderr.slice(0, 400));
} else {
  const lines = mig.stdout.split("\n");
  const pending = [];
  for (const line of lines) {
    const m = line.match(/^\s+(\d{4})\s+\|\s+(\d{4})?\s+\|/);
    if (m && !m[2]?.trim()) pending.push(m[1]);
  }
  if (pending.length === 0) pass("Local and remote migrations aligned");
  else warn(`Pending on remote: ${pending.join(", ")} — run npm run db:push`);
}

section("Phase 1b — Local .env.local");
if (!existsSync(resolve(root, ".env.local"))) {
  fail(".env.local missing — copy from .env.local.example");
} else {
  for (const key of REQUIRED_ENV) {
    const v = process.env[key];
    if (!v || isPlaceholder(v)) fail(`${key} missing or placeholder`);
    else pass(`${key} configured`);
  }
  for (const key of OPTIONAL_ENV) {
    const v = process.env[key];
    if (!v || isPlaceholder(v)) warn(`${key} not set (optional)`);
    else pass(`${key} configured`);
  }
}

section("Phase 1c — Remote SQL probes (supabase db query --linked)");
const queries = [
  {
    label: "profiles by role",
    sql: "select role::text as role, count(*)::int as n from public.profiles group by role order by role;",
  },
  {
    label: "entity counts",
    sql: "select (select count(*)::int from public.studios) as studios, (select count(*)::int from public.classes) as classes, (select count(*)::int from public.leads) as leads, (select count(*)::int from public.enrollments) as enrollments;",
  },
  {
    label: "latest migration",
    sql: "select version from supabase_migrations.schema_migrations order by version desc limit 1;",
  },
];

for (const q of queries) {
  const r = run("npx", ["supabase", "db", "query", "--linked", "-o", "table", q.sql], {
    timeout: 90_000,
  });
  if (r.ok) {
    pass(q.label);
    const table = r.stdout.split("\n").slice(-6).join("\n");
    console.log(table);
  } else {
    warn(`${q.label} — skipped (${r.stderr?.split("\n")[0] ?? "query failed"})`);
  }
}

section("Phase 1d — Integration test gate");
const integrationReady =
  process.env.INTEGRATION_TEST === "1" &&
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  !isPlaceholder(process.env.SUPABASE_SERVICE_ROLE_KEY);
if (integrationReady) pass("INTEGRATION_TEST=1 with real service role — run npm run test:integration");
else warn("Integration tests skipped — set real SUPABASE_SERVICE_ROLE_KEY and INTEGRATION_TEST=1");

console.log("\nDone. See STAGING_AUDIT.md for the full smoke-test matrix.\n");
