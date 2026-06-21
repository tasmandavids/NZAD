#!/usr/bin/env node
/**
 * Promote an existing auth user to studio admin + platform operator.
 *
 * Usage:
 *   node --env-file=.env.local scripts/promote-user-admin.mjs tasmandavids@gmail.com
 */

import { createClient } from "@supabase/supabase-js";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Usage: node --env-file=.env.local scripts/promote-user-admin.mjs <email>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function findUserByEmail(target) {
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data.users.find((u) => u.email?.toLowerCase() === target);
    if (match) return match;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

async function main() {
  const user = await findUserByEmail(email);
  if (!user) {
    console.error(`No auth user found for ${email}. Sign in once at /login first.`);
    process.exit(1);
  }

  const fullName =
    (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name) ||
    email.split("@")[0];

  const { data: profile } = await admin
    .from("profiles")
    .select("studio_id, role")
    .eq("id", user.id)
    .maybeSingle();

  const { error: profileErr } = await admin
    .from("profiles")
    .update({ email, role: "admin", full_name: fullName })
    .eq("id", user.id);
  if (profileErr) throw profileErr;

  const { error: opErr } = await admin.from("platform_operators").upsert(
    {
      user_id: user.id,
      full_name: fullName,
      title: "Olune Operator",
      permissions: ["*"],
    },
    { onConflict: "user_id" },
  );
  if (opErr) throw opErr;

  console.log(`Promoted ${email} (${user.id})`);
  console.log(`  Studio admin: role=admin, studio_id=${profile?.studio_id ?? "(none — complete onboarding if needed)"}`);
  console.log(`  Platform operator: yes`);
  console.log("\nGoogle OAuth test user (manual — no API):");
  console.log("  https://console.cloud.google.com/auth/audience?project=178044438344");
  console.log("  → Test users → Add users →", email);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
