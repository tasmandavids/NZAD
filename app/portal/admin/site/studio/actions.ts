"use server";

// ============================================================================
//  Admin · Site Builder v2 (Studio) server actions — isolated from v1.
//  Reads/writes ONLY the site_builder_documents table + creates the linking
//  site_pages row. Never touches site_pages.blocks.
// ============================================================================

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normalizeDocument } from "@/lib/builder/document";
import { STARTER_TEMPLATE_MAP } from "@/lib/builder/templates";
import type { BuilderDocument } from "@/lib/builder/schema";

export type StudioResult<T = null> = { ok: true; data: T } | { ok: false; error: string };

const RESERVED = new Set(["", "portal", "login", "logout", "enrol", "enroll", "onboarding", "programmes", "api", "admin", "auth", "site", "home"]);

function slugify(input: string): string {
  return input.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

async function getAdminStudio() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in.", supabase, studioId: null };
  const { data: profile } = await supabase.from("profiles").select("studio_id, role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { error: "Admin only.", supabase, studioId: null };
  if (!profile.studio_id) return { error: "No studio found.", supabase, studioId: null };
  return { error: null, supabase, studioId: profile.studio_id as string };
}

/** Create a draft site_pages row + its builder document from a starter template. */
export async function createStudioPage(templateId: string, title?: string): Promise<StudioResult<{ pageId: string }>> {
  const template = STARTER_TEMPLATE_MAP[templateId];
  if (!template) return { ok: false, error: "Unknown template." };

  const { error, supabase, studioId } = await getAdminStudio();
  if (error || !studioId) return { ok: false, error: error ?? "Unknown error" };

  const pageTitle = title?.trim() || template.name;
  // v2 pages are non-home, hidden-from-nav drafts so they can't disturb the live site.
  let slug = slugify(`studio-${pageTitle}`);
  if (RESERVED.has(slug) || !slug) slug = `studio-${Date.now().toString(36)}`;

  const { data: page, error: pErr } = await supabase
    .from("site_pages")
    .insert({ studio_id: studioId, title: pageTitle, slug, is_home: false, show_in_nav: false, status: "draft", blocks: [] })
    .select("id")
    .single();
  if (pErr) {
    if (pErr.code === "23505") return { ok: false, error: "A page with that URL already exists." };
    return { ok: false, error: pErr.message };
  }

  const pageId = page.id as string;
  const doc = template.build();
  doc.meta = { ...doc.meta, title: pageTitle, slug };

  const { error: dErr } = await supabase
    .from("site_builder_documents")
    .insert({ page_id: pageId, studio_id: studioId, document: doc, template_id: templateId });
  if (dErr) {
    // Roll back the orphan page so we don't leave junk behind.
    await supabase.from("site_pages").delete().eq("id", pageId);
    return { ok: false, error: missingTableHint(dErr.message) };
  }

  revalidatePath("/portal/admin/site/studio");
  return { ok: true, data: { pageId } };
}

/** Persist a document. Validated/normalized before write. */
export async function saveBuilderDocument(pageId: string, rawDoc: BuilderDocument): Promise<StudioResult> {
  if (!pageId) return { ok: false, error: "Missing page id." };
  const { error, supabase, studioId } = await getAdminStudio();
  if (error || !studioId) return { ok: false, error: error ?? "Unknown error" };

  const doc = normalizeDocument(rawDoc);
  if (!doc) return { ok: false, error: "Document failed validation." };

  const { error: dErr } = await supabase
    .from("site_builder_documents")
    .upsert({ page_id: pageId, studio_id: studioId, document: doc, updated_at: new Date().toISOString() }, { onConflict: "page_id" });
  if (dErr) return { ok: false, error: missingTableHint(dErr.message) };

  revalidatePath(`/portal/admin/site/studio/${pageId}`);
  return { ok: true, data: null };
}

export async function deleteStudioPage(pageId: string): Promise<StudioResult> {
  const { error, supabase, studioId } = await getAdminStudio();
  if (error || !studioId) return { ok: false, error: error ?? "Unknown error" };
  // Cascade deletes the builder document via FK.
  const { error: dErr } = await supabase.from("site_pages").delete().eq("id", pageId).eq("studio_id", studioId);
  if (dErr) return { ok: false, error: dErr.message };
  revalidatePath("/portal/admin/site/studio");
  return { ok: true, data: null };
}

function missingTableHint(msg: string): string {
  if (/relation .*site_builder_documents.* does not exist/i.test(msg) || /could not find the table/i.test(msg)) {
    return "Studio storage not provisioned yet — run migration 0057_site_builder_v2.sql (npm run db:push).";
  }
  return msg;
}
