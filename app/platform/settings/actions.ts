"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformOperator } from "@/lib/platform/auth";
import { logPlatformAudit } from "@/lib/platform/audit";
import type { PlatformSettings } from "@/lib/platform/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

const SettingsSchema = z.object({
  maintenanceMode: z.boolean().optional(),
  defaultTrialDays: z.number().int().min(0).max(365).optional(),
  supportEmail: z.string().email().optional(),
  signupEnabled: z.boolean().optional(),
  welcomeMessage: z.string().max(500).optional(),
});

export async function updatePlatformSettings(input: unknown): Promise<ActionResult> {
  const auth = await requirePlatformOperator();
  if (!auth.ok) return auth;

  const parsed = SettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const admin = createAdminClient();
  const { data: current } = await admin.from("platform_settings").select("settings").eq("id", 1).single();
  const merged: PlatformSettings = {
    ...((current?.settings as PlatformSettings) ?? {}),
    ...parsed.data,
  };

  const { error } = await admin
    .from("platform_settings")
    .update({ settings: merged, updated_by: auth.userId, updated_at: new Date().toISOString() })
    .eq("id", 1);

  if (error) return { ok: false, error: error.message };

  await logPlatformAudit({
    operatorId: auth.userId,
    action: "settings.update",
    targetType: "platform_settings",
    targetId: "1",
    metadata: parsed.data as Record<string, unknown>,
  });

  revalidatePath("/platform/settings");
  return { ok: true };
}
