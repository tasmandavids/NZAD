"use server";

// ============================================================================
//  Admin · Site builder server actions
//  Manage a studio's public website pages: create / edit / reorder / publish /
//  delete, and save the block layout of a page.
// ============================================================================

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normalizeBlocks, makeBlock, type BlockType } from "@/lib/site/blocks";

export type ActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// Top-level paths that belong to the app, not studio pages.
const RESERVED_SLUGS = new Set([
  "", "portal", "login", "logout", "enrol", "enroll", "onboarding",
  "programmes", "api", "admin", "auth", "site",
]);

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function getAdminStudio() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in.", supabase, studioId: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("studio_id, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return { error: "Admin only.", supabase, studioId: null };
  if (!profile.studio_id) return { error: "No studio found.", supabase, studioId: null };

  return { error: null, supabase, studioId: profile.studio_id as string };
}

function refresh() {
  revalidatePath("/portal/admin/site");
  revalidatePath("/", "layout"); // public site is studio-host-scoped
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

const CreateSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  slug: z.string().max(100).optional(),
  isHome: z.coerce.boolean().optional(),
});

export async function createPage(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = CreateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { error, supabase, studioId } = await getAdminStudio();
  if (error || !studioId) return { ok: false, error: error ?? "Unknown error" };

  const isHome = !!parsed.data.isHome;
  const slug = isHome ? "home" : slugify(parsed.data.slug || parsed.data.title);

  if (!isHome && (RESERVED_SLUGS.has(slug) || !slug)) {
    return { ok: false, error: `"${slug}" is a reserved or invalid URL.` };
  }

  // If creating a homepage, demote any existing home first (partial unique idx).
  if (isHome) {
    await supabase.from("site_pages").update({ is_home: false }).eq("studio_id", studioId).eq("is_home", true);
  }

  const { data, error: dbErr } = await supabase
    .from("site_pages")
    .insert({
      studio_id: studioId,
      title: parsed.data.title,
      slug,
      is_home: isHome,
      blocks: [],
      status: "draft",
    })
    .select("id")
    .single();

  if (dbErr) {
    if (dbErr.code === "23505") return { ok: false, error: "A page with that URL already exists." };
    return { ok: false, error: dbErr.message };
  }

  refresh();
  return { ok: true, data: { id: data.id as string } };
}

// ─── STARTER HOMEPAGE ─────────────────────────────────────────────────────────

// A sensible default block stack so a studio gets a complete site in one click.
const STARTER_STACK: BlockType[] = [
  "hero",
  "features",
  "classGrid",
  "testimonials",
  "cta",
  "contact",
];

export async function createStarterHomepage(): Promise<ActionResult<{ id: string }>> {
  const { error, supabase, studioId } = await getAdminStudio();
  if (error || !studioId) return { ok: false, error: error ?? "Unknown error" };

  // Don't clobber an existing homepage.
  const { data: existingHome } = await supabase
    .from("site_pages")
    .select("id")
    .eq("studio_id", studioId)
    .eq("is_home", true)
    .maybeSingle();
  if (existingHome) {
    return { ok: false, error: "You already have a homepage. Edit it instead." };
  }

  const blocks = STARTER_STACK.map((type) => makeBlock(type));

  const { data, error: dbErr } = await supabase
    .from("site_pages")
    .insert({
      studio_id: studioId,
      title: "Home",
      slug: "home",
      is_home: true,
      show_in_nav: false,
      blocks,
      status: "draft",
    })
    .select("id")
    .single();

  if (dbErr) {
    if (dbErr.code === "23505") return { ok: false, error: "A homepage already exists." };
    return { ok: false, error: dbErr.message };
  }

  refresh();
  return { ok: true, data: { id: data.id as string } };
}

// ─── UPDATE META ────────────────────────────────────────────────────────────────

const MetaSchema = z.object({
  pageId: z.string().uuid(),
  title: z.string().min(1).max(100),
  slug: z.string().max(100),
  navLabel: z.string().max(60).optional().or(z.literal("")),
  showInNav: z.coerce.boolean(),
  navOrder: z.coerce.number().int().min(0).max(999),
  seoTitle: z.string().max(160).optional().or(z.literal("")),
  seoDescription: z.string().max(320).optional().or(z.literal("")),
});

export async function updatePageMeta(input: unknown): Promise<ActionResult> {
  const parsed = MetaSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { error, supabase, studioId } = await getAdminStudio();
  if (error || !studioId) return { ok: false, error: error ?? "Unknown error" };

  // Resolve whether this is the home page (home keeps slug 'home', not editable).
  const { data: existing } = await supabase
    .from("site_pages")
    .select("is_home")
    .eq("id", parsed.data.pageId)
    .eq("studio_id", studioId)
    .single();
  if (!existing) return { ok: false, error: "Page not found." };

  const slug = existing.is_home ? "home" : slugify(parsed.data.slug);
  if (!existing.is_home && (RESERVED_SLUGS.has(slug) || !slug)) {
    return { ok: false, error: `"${slug}" is a reserved or invalid URL.` };
  }

  const { error: dbErr } = await supabase
    .from("site_pages")
    .update({
      title: parsed.data.title,
      slug,
      nav_label: parsed.data.navLabel || null,
      show_in_nav: parsed.data.showInNav,
      nav_order: parsed.data.navOrder,
      seo_title: parsed.data.seoTitle || null,
      seo_description: parsed.data.seoDescription || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.pageId)
    .eq("studio_id", studioId);

  if (dbErr) {
    if (dbErr.code === "23505") return { ok: false, error: "A page with that URL already exists." };
    return { ok: false, error: dbErr.message };
  }

  refresh();
  return { ok: true, data: null };
}

// ─── SAVE BLOCKS ──────────────────────────────────────────────────────────────

export async function savePageBlocks(pageId: string, rawBlocks: unknown): Promise<ActionResult> {
  if (!pageId) return { ok: false, error: "Missing page id." };

  const { error, supabase, studioId } = await getAdminStudio();
  if (error || !studioId) return { ok: false, error: error ?? "Unknown error" };

  // Server-side validation: drop anything that isn't a known block.
  const blocks = normalizeBlocks(rawBlocks);

  const { error: dbErr } = await supabase
    .from("site_pages")
    .update({ blocks, updated_at: new Date().toISOString() })
    .eq("id", pageId)
    .eq("studio_id", studioId);

  if (dbErr) return { ok: false, error: dbErr.message };

  refresh();
  return { ok: true, data: null };
}

// ─── PUBLISH / UNPUBLISH ────────────────────────────────────────────────────────

async function setStatus(pageId: string, status: "draft" | "published"): Promise<ActionResult> {
  const { error, supabase, studioId } = await getAdminStudio();
  if (error || !studioId) return { ok: false, error: error ?? "Unknown error" };

  const { error: dbErr } = await supabase
    .from("site_pages")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", pageId)
    .eq("studio_id", studioId);

  if (dbErr) return { ok: false, error: dbErr.message };
  refresh();
  return { ok: true, data: null };
}

export const publishPage = (pageId: string) => setStatus(pageId, "published");
export const unpublishPage = (pageId: string) => setStatus(pageId, "draft");

// ─── SET HOME ───────────────────────────────────────────────────────────────────

export async function setHomePage(pageId: string): Promise<ActionResult> {
  const { error, supabase, studioId } = await getAdminStudio();
  if (error || !studioId) return { ok: false, error: error ?? "Unknown error" };

  // Demote current home, then promote this one (two steps to satisfy the
  // partial unique index on is_home).
  await supabase.from("site_pages").update({ is_home: false }).eq("studio_id", studioId).eq("is_home", true);

  const { error: dbErr } = await supabase
    .from("site_pages")
    .update({ is_home: true, updated_at: new Date().toISOString() })
    .eq("id", pageId)
    .eq("studio_id", studioId);

  if (dbErr) return { ok: false, error: dbErr.message };
  refresh();
  return { ok: true, data: null };
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function deletePage(pageId: string): Promise<ActionResult> {
  const { error, supabase, studioId } = await getAdminStudio();
  if (error || !studioId) return { ok: false, error: error ?? "Unknown error" };

  const { error: dbErr } = await supabase
    .from("site_pages")
    .delete()
    .eq("id", pageId)
    .eq("studio_id", studioId);

  if (dbErr) return { ok: false, error: dbErr.message };
  refresh();
  return { ok: true, data: null };
}
