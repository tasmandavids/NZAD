"use server";

// ============================================================================
//  Admin settings server actions
// ============================================================================

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const StudioNameSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(80, "Name must be under 80 characters").trim(),
});

export type SettingsResult = { ok: true } | { ok: false; error: string };

export async function updateStudioName(input: unknown): Promise<SettingsResult> {
  const parsed = StudioNameSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("studio_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.studio_id) return { ok: false, error: "No studio found." };
  if (profile.role !== "admin") return { ok: false, error: "Only admins can change studio settings." };

  const { error } = await supabase
    .from("studios")
    .update({ name: parsed.data.name })
    .eq("id", profile.studio_id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

// ─── Sibling / family discount (Phase 3.3) ────────────────────────────────────

const SiblingDiscountSchema = z.object({
  pct: z.coerce.number().int().min(0, "Must be 0 or more").max(100, "Must be 100 or less"),
});

export async function updateSiblingDiscount(input: unknown): Promise<SettingsResult> {
  const parsed = SiblingDiscountSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("studio_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.studio_id) return { ok: false, error: "No studio found." };
  if (profile.role !== "admin") return { ok: false, error: "Only admins can change studio settings." };

  const { error } = await supabase
    .from("studios")
    .update({ sibling_discount_pct: parsed.data.pct })
    .eq("id", profile.studio_id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/portal/admin/settings");
  return { ok: true };
}

// ─── Family discount on retail (Session 9 · Priority 1) ───────────────────────
// Opt-in flag: when enabled, the studio's sibling_discount_pct also applies to
// shop orders and event-ticket purchases for families with an active enrollment.

const FamilyRetailSchema = z.object({ enabled: z.coerce.boolean() });

export async function updateFamilyRetailDiscount(input: unknown): Promise<SettingsResult> {
  const parsed = FamilyRetailSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("studio_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.studio_id) return { ok: false, error: "No studio found." };
  if (profile.role !== "admin") return { ok: false, error: "Only admins can change studio settings." };

  const { error } = await supabase
    .from("studios")
    .update({ family_discount_on_retail: parsed.data.enabled })
    .eq("id", profile.studio_id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/portal/admin/settings");
  return { ok: true };
}

// ─── Timezone (Session 8 · Priority 1) ────────────────────────────────────────
// IANA timezone name used by the notifications cron to compute the studio's
// local "today"/"tomorrow" for reminders, birthdays and overdue sweeps.

const TimezoneSchema = z.object({
  timezone: z
    .string()
    .min(1, "Timezone is required")
    .refine((tz) => {
      try {
        new Intl.DateTimeFormat("en-CA", { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    }, "Not a valid IANA timezone"),
});

export async function updateStudioTimezone(input: unknown): Promise<SettingsResult> {
  const parsed = TimezoneSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("studio_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.studio_id) return { ok: false, error: "No studio found." };
  if (profile.role !== "admin") return { ok: false, error: "Only admins can change studio settings." };

  const { error } = await supabase
    .from("studios")
    .update({ timezone: parsed.data.timezone })
    .eq("id", profile.studio_id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/portal/admin/settings");
  return { ok: true };
}
