"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateAdCopy } from "@/lib/advertising/ai-ads";
import { modernizeSeoFields, runSeoAudit } from "@/lib/advertising/ai-seo";
import { publishCampaignToPlatforms } from "@/lib/advertising/publish";
import type {
  AdCampaignStatus,
  AdObjective,
  GeneratedAdCopy,
  SocialPlatform,
} from "@/lib/advertising/types";

export type ActionResult = { ok: true } | { ok: false; error: string };
export type ActionResultWith<T> = ({ ok: true } & T) | { ok: false; error: string };

const PLATFORMS: SocialPlatform[] = ["facebook", "instagram", "tiktok"];
const OBJECTIVES: AdObjective[] = ["awareness", "traffic", "engagement", "conversions", "leads"];
const STATUSES: AdCampaignStatus[] = ["draft", "scheduled", "active", "paused", "completed", "failed"];

async function getAdminStudio() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in.", supabase, studioId: null, userId: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("studio_id, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return { error: "Admin only.", supabase, studioId: null, userId: null };
  if (!profile.studio_id) return { error: "No studio.", supabase, studioId: null, userId: null };

  return { error: null, supabase, studioId: profile.studio_id as string, userId: user.id };
}

const GenerateAdSchema = z.object({
  prompt: z.string().min(3, "Describe what you want to promote").max(2000),
  objective: z.enum(["awareness", "traffic", "engagement", "conversions", "leads"]),
  platforms: z.array(z.enum(["facebook", "instagram", "tiktok"])).min(1, "Select at least one platform"),
  targetUrl: z.string().url().optional().or(z.literal("")),
});

export async function generateAdWithAi(input: unknown): Promise<ActionResultWith<{ copy: GeneratedAdCopy }>> {
  const parsed = GenerateAdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { error, supabase, studioId } = await getAdminStudio();
  if (error || !studioId) return { ok: false, error: error ?? "Unknown" };

  const { data: studio } = await supabase.from("studios").select("name").eq("id", studioId).single();
  const studioName = (studio?.name as string) ?? "Your Studio";

  const copy = await generateAdCopy({
    studioName,
    objective: parsed.data.objective,
    platforms: parsed.data.platforms,
    prompt: parsed.data.prompt,
    targetUrl: parsed.data.targetUrl || null,
  });

  return { ok: true, copy };
}

const CampaignSchema = z.object({
  name: z.string().min(1, "Campaign name required").max(120),
  objective: z.enum(["awareness", "traffic", "engagement", "conversions", "leads"]),
  platforms: z.array(z.enum(["facebook", "instagram", "tiktok"])).min(1),
  headline: z.string().max(200).optional().or(z.literal("")),
  bodyText: z.string().max(5000).optional().or(z.literal("")),
  callToAction: z.string().max(60).optional().or(z.literal("")),
  imageUrl: z.string().url().optional().or(z.literal("")),
  videoUrl: z.string().url().optional().or(z.literal("")),
  targetUrl: z.string().url().optional().or(z.literal("")),
  budgetCents: z.coerce.number().int().min(0).optional(),
  scheduledAt: z.string().optional().or(z.literal("")),
  aiGenerated: z.boolean().optional(),
});

export async function createCampaign(input: unknown): Promise<ActionResultWith<{ id: string }>> {
  const parsed = CampaignSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { error, supabase, studioId } = await getAdminStudio();
  if (error || !studioId) return { ok: false, error: error ?? "Unknown" };

  const d = parsed.data;
  const status: AdCampaignStatus = d.scheduledAt ? "scheduled" : "draft";

  const { data, error: dbErr } = await supabase
    .from("ad_campaigns")
    .insert({
      studio_id: studioId,
      name: d.name,
      objective: d.objective,
      status,
      platforms: d.platforms,
      headline: d.headline || null,
      body_text: d.bodyText || null,
      call_to_action: d.callToAction || null,
      image_url: d.imageUrl || null,
      video_url: d.videoUrl || null,
      target_url: d.targetUrl || null,
      budget_cents: d.budgetCents ?? null,
      scheduled_at: d.scheduledAt || null,
      ai_generated: d.aiGenerated ?? false,
    })
    .select("id")
    .single();

  if (dbErr) return { ok: false, error: dbErr.message };
  revalidatePath("/portal/admin/advertising");
  return { ok: true, id: data.id as string };
}

export async function publishCampaign(campaignId: string): Promise<ActionResult> {
  const { error, supabase, studioId } = await getAdminStudio();
  if (error || !studioId) return { ok: false, error: error ?? "Unknown" };

  const { data: row, error: fetchErr } = await supabase
    .from("ad_campaigns")
    .select("*")
    .eq("id", campaignId)
    .eq("studio_id", studioId)
    .single();

  if (fetchErr || !row) return { ok: false, error: "Campaign not found" };

  const campaign = {
    id: row.id as string,
    name: row.name as string,
    objective: row.objective as AdObjective,
    status: row.status as AdCampaignStatus,
    platforms: row.platforms as SocialPlatform[],
    headline: row.headline as string | null,
    bodyText: row.body_text as string | null,
    callToAction: row.call_to_action as string | null,
    imageUrl: row.image_url as string | null,
    videoUrl: row.video_url as string | null,
    targetUrl: row.target_url as string | null,
    budgetCents: row.budget_cents as number | null,
    scheduledAt: row.scheduled_at as string | null,
    publishedAt: row.published_at as string | null,
    platformIds: (row.platform_ids ?? {}) as Record<string, string>,
    publishError: row.publish_error as string | null,
    aiGenerated: row.ai_generated as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };

  const { platformIds, errors } = await publishCampaignToPlatforms(supabase, studioId, campaign);
  const errorMessages = Object.entries(errors).map(([p, e]) => `${p}: ${e}`);
  const hasSuccess = Object.keys(platformIds).length > 0;
  const allFailed = campaign.platforms.every((p) => errors[p]);

  const { error: updateErr } = await supabase
    .from("ad_campaigns")
    .update({
      status: allFailed ? "failed" : hasSuccess ? "active" : "failed",
      platform_ids: { ...campaign.platformIds, ...platformIds },
      published_at: hasSuccess ? new Date().toISOString() : campaign.publishedAt,
      publish_error: errorMessages.length ? errorMessages.join("; ") : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignId);

  if (updateErr) return { ok: false, error: updateErr.message };
  revalidatePath("/portal/admin/advertising");

  if (allFailed) return { ok: false, error: errorMessages.join("; ") || "Publish failed" };
  return { ok: true };
}

export async function deleteCampaign(campaignId: string): Promise<ActionResult> {
  const { error, supabase, studioId } = await getAdminStudio();
  if (error || !studioId) return { ok: false, error: error ?? "Unknown" };

  const { error: dbErr } = await supabase
    .from("ad_campaigns")
    .delete()
    .eq("id", campaignId)
    .eq("studio_id", studioId);

  if (dbErr) return { ok: false, error: dbErr.message };
  revalidatePath("/portal/admin/advertising");
  return { ok: true };
}

export async function disconnectSocialPlatform(platform: SocialPlatform): Promise<ActionResult> {
  if (!PLATFORMS.includes(platform)) return { ok: false, error: "Invalid platform" };

  const { error, supabase, studioId } = await getAdminStudio();
  if (error || !studioId) return { ok: false, error: error ?? "Unknown" };

  const { error: dbErr } = await supabase
    .from("social_connections")
    .delete()
    .eq("studio_id", studioId)
    .eq("platform", platform);

  if (dbErr) return { ok: false, error: dbErr.message };
  revalidatePath("/portal/admin/advertising");
  return { ok: true };
}

export async function runSeoAuditAction(
  focusPageId?: string | null,
): Promise<
  ActionResultWith<{ auditId: string; score: number; summary: string; recommendationCount: number }>
> {
  const { error, supabase, studioId } = await getAdminStudio();
  if (error || !studioId) return { ok: false, error: error ?? "Unknown" };

  const [{ data: studio }, { data: pages }] = await Promise.all([
    supabase.from("studios").select("name, slug, custom_domain").eq("id", studioId).single(),
    supabase
      .from("site_pages")
      .select("id, title, slug, status, seo_title, seo_description, is_home")
      .eq("studio_id", studioId)
      .order("nav_order"),
  ]);

  const studioName = (studio?.name as string) ?? "Studio";
  const siteUrl = studio?.custom_domain
    ? `https://${studio.custom_domain}`
    : studio?.slug
      ? `https://${studio.slug}.olune.co.nz`
      : null;

  const pageSnapshots = (pages ?? []).map((p) => ({
    id: p.id as string,
    title: p.title as string,
    slug: p.slug as string,
    status: p.status as string,
    seoTitle: p.seo_title as string | null,
    seoDescription: p.seo_description as string | null,
    isHome: p.is_home as boolean,
  }));

  const result = await runSeoAudit({
    studioName,
    siteUrl,
    pages: pageSnapshots,
    focusPageId,
  });

  const { data, error: dbErr } = await supabase
    .from("seo_audits")
    .insert({
      studio_id: studioId,
      page_id: focusPageId || null,
      score: result.score,
      recommendations: result.recommendations,
      ai_summary: result.summary,
    })
    .select("id")
    .single();

  if (dbErr) return { ok: false, error: dbErr.message };
  revalidatePath("/portal/admin/advertising");
  return {
    ok: true,
    auditId: data.id as string,
    score: result.score,
    summary: result.summary,
    recommendationCount: result.recommendations.length,
  };
}

export async function applySeoModernization(pageId: string): Promise<ActionResultWith<{ seoTitle: string; seoDescription: string }>> {
  const { error, supabase, studioId } = await getAdminStudio();
  if (error || !studioId) return { ok: false, error: error ?? "Unknown" };

  const [{ data: studio }, { data: page }] = await Promise.all([
    supabase.from("studios").select("name").eq("id", studioId).single(),
    supabase
      .from("site_pages")
      .select("id, title, seo_title, seo_description")
      .eq("id", pageId)
      .eq("studio_id", studioId)
      .single(),
  ]);

  if (!page) return { ok: false, error: "Page not found" };

  const modernized = await modernizeSeoFields({
    studioName: (studio?.name as string) ?? "Studio",
    pageTitle: page.title as string,
    currentTitle: page.seo_title as string | null,
    currentDescription: page.seo_description as string | null,
  });

  const { error: updateErr } = await supabase
    .from("site_pages")
    .update({
      seo_title: modernized.seoTitle,
      seo_description: modernized.seoDescription,
    })
    .eq("id", pageId)
    .eq("studio_id", studioId);

  if (updateErr) return { ok: false, error: updateErr.message };
  revalidatePath("/portal/admin/advertising");
  revalidatePath("/portal/admin/site");
  return { ok: true, ...modernized };
}

export { PLATFORMS, OBJECTIVES, STATUSES };
