// ============================================================================
//  tests/rls.test.mjs — cross-tenant Row-Level-Security isolation tests.
//
//  These prove the database enforces multi-tenant isolation regardless of the
//  app layer: a user in one studio (or family) must never read or write another
//  studio's (or family's) data, and anonymous callers must see no private rows.
//
//  Requires the local Supabase stack running (`supabase start`). Run with:
//      npm run test:rls
//
//  Uses the service-role key ONLY to seed fixtures (bypasses RLS); every
//  assertion runs through a normal signed-in (anon-key) client so RLS applies.
// ============================================================================

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const ANON =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const svc = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
const tag = `rls${Date.now().toString(36)}`;
const PW = "TestPass123!";

/** Create a confirmed auth user and return its id. */
async function makeUser(label) {
  const email = `${tag}-${label}@test.dev`;
  const { data, error } = await svc.auth.admin.createUser({ email, password: PW, email_confirm: true });
  assert.equal(error, null, `createUser(${label}): ${error?.message}`);
  return { id: data.user.id, email };
}

/** A fresh anon-key client signed in as the given user (RLS applies to it). */
async function asUser(email) {
  const c = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: PW });
  assert.equal(error, null, `signIn(${email}): ${error?.message}`);
  return c;
}

const ids = { studios: [], users: [] };
const ctx = {};

before(async () => {
  // Two independent studios (tenants).
  for (const key of ["A", "B"]) {
    const { data: studio, error } = await svc
      .from("studios")
      .insert({ name: `Studio ${key} ${tag}`, slug: `${tag}-${key.toLowerCase()}`, status: "trial" })
      .select("id")
      .single();
    assert.equal(error, null, `insert studio ${key}: ${error?.message}`);
    ids.studios.push(studio.id);
    ctx[`studio${key}`] = studio.id;
    await svc.from("studio_branding").insert({ studio_id: studio.id });
  }

  // Users: admin/parent/student/teacher in A; admin/parent in B; a 2nd parent in A.
  const spec = {
    adminA: { studio: ctx.studioA, role: "admin" },
    parentA: { studio: ctx.studioA, role: "parent" },
    parent2A: { studio: ctx.studioA, role: "parent" },
    studentA: { studio: ctx.studioA, role: "student" },
    teacherA: { studio: ctx.studioA, role: "teacher" },
    adminB: { studio: ctx.studioB, role: "admin" },
    parentB: { studio: ctx.studioB, role: "parent" },
  };
  for (const [label, { studio, role }] of Object.entries(spec)) {
    const u = await makeUser(label);
    ids.users.push(u.id);
    ctx[label] = { ...u, studio, role };
    const { error } = await svc
      .from("profiles")
      .update({ studio_id: studio, role, full_name: label })
      .eq("id", u.id);
    assert.equal(error, null, `set profile ${label}: ${error?.message}`);
  }

  // parentA guards studentA (same family); class + enrollment in studio A.
  await svc.from("guardianships").insert({
    studio_id: ctx.studioA, guardian_id: ctx.parentA.id, student_id: ctx.studentA.id, is_primary: true,
  });
  const { data: klass } = await svc
    .from("classes")
    .insert({ studio_id: ctx.studioA, teacher_id: ctx.teacherA.id, name: "Ballet I", capacity: 10, price_cents: 5000 })
    .select("id").single();
  ctx.classA = klass.id;
  await svc.from("enrollments").insert({ studio_id: ctx.studioA, student_id: ctx.studentA.id, class_id: klass.id });

  // Invoices: one for parentA, one for parent2A (same studio, different family),
  // one for parentB (different studio).
  const inv = async (studio, payer) => {
    const { data } = await svc.from("invoices")
      .insert({ studio_id: studio, payer_id: payer, amount_cents: 5000, status: "sent" })
      .select("id").single();
    return data.id;
  };
  ctx.invoiceA = await inv(ctx.studioA, ctx.parentA.id);
  ctx.invoice2A = await inv(ctx.studioA, ctx.parent2A.id);
  ctx.invoiceB = await inv(ctx.studioB, ctx.parentB.id);
});

after(async () => {
  // Best-effort cleanup (service role). Deleting the studio cascades its rows;
  // deleting the auth users cascades their profiles.
  for (const id of ids.studios) await svc.from("studios").delete().eq("id", id);
  for (const id of ids.users) await svc.auth.admin.deleteUser(id).catch(() => {});
});

test("parent sees their OWN invoice (sanity: the model returns data)", async () => {
  const c = await asUser(ctx.parentA.email);
  const { data } = await c.from("invoices").select("id").eq("id", ctx.invoiceA);
  assert.equal(data.length, 1, "parentA should see their own invoice");
});

test("cross-studio: parent cannot read another studio's invoices", async () => {
  const c = await asUser(ctx.parentA.email);
  const { data } = await c.from("invoices").select("id").eq("id", ctx.invoiceB);
  assert.equal(data.length, 0, "parentA must NOT see studio B's invoice");
});

test("cross-studio: parent cannot read another studio's profiles", async () => {
  const c = await asUser(ctx.parentA.email);
  const { data } = await c.from("profiles").select("id").eq("id", ctx.parentB.id);
  assert.equal(data.length, 0, "parentA must NOT see a studio B profile");
});

test("cross-family (same studio): parent cannot read another family's invoice", async () => {
  const c = await asUser(ctx.parentA.email);
  const { data } = await c.from("invoices").select("id").eq("id", ctx.invoice2A);
  assert.equal(data.length, 0, "parentA must NOT see parent2A's invoice");
});

test("students & teachers have NO access to invoices", async () => {
  for (const who of ["studentA", "teacherA"]) {
    const c = await asUser(ctx[who].email);
    const { data } = await c.from("invoices").select("id");
    assert.equal(data.length, 0, `${who} must see zero invoices`);
  }
});

test("privilege escalation blocked: parent cannot promote self to admin", async () => {
  const c = await asUser(ctx.parentA.email);
  const { error } = await c.from("profiles").update({ role: "admin" }).eq("id", ctx.parentA.id);
  assert.notEqual(error, null, "self role-escalation must be rejected");
});

test("cross-tenant write blocked: parent cannot edit another studio's branding", async () => {
  const c = await asUser(ctx.parentA.email);
  const { data } = await c.from("studio_branding")
    .update({ tagline: "hacked" }).eq("studio_id", ctx.studioB).select("studio_id");
  assert.equal((data ?? []).length, 0, "no studio B branding row may be updated by parentA");
  // Confirm it really wasn't written.
  const { data: check } = await svc.from("studio_branding").select("tagline").eq("studio_id", ctx.studioB).single();
  assert.notEqual(check.tagline, "hacked", "studio B branding must be unchanged");
});

test("anonymous callers see no private rows (profiles, invoices)", async () => {
  const anon = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: profiles } = await anon.from("profiles").select("id");
  assert.equal((profiles ?? []).length, 0, "anon must read zero profiles");
  const { data: invoices } = await anon.from("invoices").select("id");
  assert.equal((invoices ?? []).length, 0, "anon must read zero invoices");
});

test("public identity (studios/branding) IS readable (by design, pre-login site)", async () => {
  const anon = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data } = await anon.from("studios").select("id").eq("id", ctx.studioA);
  assert.equal(data.length, 1, "anon should read public studio identity for the marketing site");
});

test("admin sees their own studio's invoices but not the other studio's", async () => {
  const c = await asUser(ctx.adminA.email);
  const { data: own } = await c.from("invoices").select("id").eq("studio_id", ctx.studioA);
  assert.ok(own.length >= 2, "adminA should see studio A invoices");
  const { data: other } = await c.from("invoices").select("id").eq("studio_id", ctx.studioB);
  assert.equal(other.length, 0, "adminA must NOT see studio B invoices");
});
