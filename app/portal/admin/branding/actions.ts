"use server";

// ============================================================================
//  saveBranding — validate (Zod) → upsert studio_branding → revalidate layout.
//  Defence in depth: RLS already blocks non-admins / other studios; we re-check
//  here so the action fails loudly rather than silently writing nothing.
// ============================================================================

import { z } from "zod";
import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { derivePalette } from "@/lib/branding";
import type { SiteSettings } from "@/lib/types";

const SiteSettingsSchema = z.object({
  footerTagline: z.string().max(300).optional(),
  showPoweredBy: z.boolean().optional(),
  portalLabel: z.string().max(40).optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().max(40).optional(),
  regionLabel: z.string().max(80).optional(),
  locations: z
    .array(z.object({ name: z.string().max(80), detail: z.string().max(200) }))
    .optional(),
});

const Schema = z.object({
  tagline: z.string().max(120).nullable().optional(),
  logoUrl: z.string().url().nullable().optional(),
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a 6-digit hex colour"),
  base: z.enum(["dark", "light"]),
  fontDisplay: z.string().max(60),
  fontBody: z.string().max(60),
  siteSettings: SiteSettingsSchema.optional(),
});

export type SaveResult = { ok: true } | { ok: false; error: string };

export async function saveBranding(input: unknown): Promise<SaveResult> {
  const parsed = Schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You're not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("studio_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.studio_id) return { ok: false, error: "No studio found for this account." };
  if (profile.role !== "admin") return { ok: false, error: "Only studio admins can change branding." };

  // Cache the derived shades so server-side rendering stays fast.
  const palette = derivePalette(data.brandColor);

  const { error } = await supabase.from("studio_branding").upsert({
    studio_id: profile.studio_id,
    tagline: data.tagline ?? null,
    logo_url: data.logoUrl ?? null,
    brand_color: data.brandColor,
    brand_hot: palette.brandHot,
    brand_deep: palette.brandDeep,
    base: data.base,
    font_display: data.fontDisplay,
    font_body: data.fontBody,
    site_settings: (data.siteSettings ?? {}) as SiteSettings,
    updated_at: new Date().toISOString(),
  });

  if (error) return { ok: false, error: error.message };

  // Re-render every route with the new tokens (the layout reads branding).
  revalidatePath("/", "layout");
  revalidateTag(`branding-${profile.studio_id}`);
  return { ok: true };
}
