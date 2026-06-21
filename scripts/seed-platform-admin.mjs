#!/usr/bin/env node
/**
 * Creates the Olune platform test admin (and optional demo studio).
 *
 * Usage:
 *   node --env-file=.env.local scripts/seed-platform-admin.mjs
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 */

import { createClient } from "@supabase/supabase-js";

const EMAIL = "platform-admin@olune.test";
const PASSWORD = "testadmin123";
const FULL_NAME = "Platform Admin";
const DEMO_STUDIO_NAME = "Demo Studio";
const DEMO_STUDIO_SLUG = "demo";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Copy .env.local.example → .env.local and fill in Supabase API keys.",
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { enabled: false },
});

async function findUserByEmail(email) {
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (match) return match;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

async function ensureUser() {
  let user = await findUserByEmail(EMAIL);

  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: FULL_NAME },
    });
    if (error) throw error;
    user = data.user;
    console.log("Created auth user:", user.id);
  } else {
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      password: PASSWORD,
      email_confirm: true,
    });
    if (error) throw error;
    console.log("Updated existing auth user password:", user.id);
  }

  return user;
}

async function ensurePlatformOperator(userId) {
  const { error } = await admin.from("platform_operators").upsert(
    {
      user_id: userId,
      full_name: FULL_NAME,
      title: "Olune Operator",
      permissions: ["*"],
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
  console.log("Platform operator row ensured.");
}

async function ensureDemoStudio(userId) {
  const { data: profile } = await admin
    .from("profiles")
    .select("studio_id")
    .eq("id", userId)
    .single();

  if (profile?.studio_id) {
    console.log("User already linked to studio:", profile.studio_id);
    return;
  }

  const { data: existingStudio } = await admin
    .from("studios")
    .select("id")
    .eq("slug", DEMO_STUDIO_SLUG)
    .maybeSingle();

  let studioId = existingStudio?.id;

  if (!studioId) {
    const { data: studio, error: studioErr } = await admin
      .from("studios")
      .insert({ name: DEMO_STUDIO_NAME, slug: DEMO_STUDIO_SLUG, status: "trial" })
      .select("id")
      .single();
    if (studioErr) throw studioErr;
    studioId = studio.id;

    const { error: brandingErr } = await admin
      .from("studio_branding")
      .insert({ studio_id: studioId });
    if (brandingErr) throw brandingErr;

    console.log("Created demo studio:", studioId);
  } else {
    console.log("Reusing existing demo studio:", studioId);
  }

  const { error: profileErr } = await admin
    .from("profiles")
    .update({
      studio_id: studioId,
      role: "admin",
      full_name: FULL_NAME,
      email: EMAIL,
    })
    .eq("id", userId);

  if (profileErr) throw profileErr;
  console.log("Linked user as demo studio admin.");
}

async function main() {
  console.log("Seeding Olune test admin…\n");

  const user = await ensureUser();
  await admin
    .from("profiles")
    .update({ full_name: FULL_NAME, email: EMAIL })
    .eq("id", user.id);

  await ensurePlatformOperator(user.id);
  await ensureDemoStudio(user.id);

  console.log("\nDone. Test credentials:");
  console.log("  Email:   ", EMAIL);
  console.log("  Password:", PASSWORD);
  console.log("\nSign in at /login then visit:");
  console.log("  /platform       — Olune operator console");
  console.log("  /portal/admin   — Demo studio admin");
  console.log("\nAlso add to Vercel env:");
  console.log(`  PLATFORM_OPERATOR_EMAILS=${EMAIL}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
