"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformOperator } from "@/lib/platform/auth";
import { logPlatformAudit } from "@/lib/platform/audit";

export type ActionResult = { ok: true } | { ok: false; error: string };

const ToggleSchema = z.object({
  flagId: z.string().uuid(),
  enabled: z.boolean(),
});

export async function toggleFeatureFlag(input: unknown): Promise<ActionResult> {
  const auth = await requirePlatformOperator();
  if (!auth.ok) return auth;

  const parsed = ToggleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("platform_feature_flags")
    .update({ enabled: parsed.data.enabled, updated_by: auth.userId, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.flagId);

  if (error) return { ok: false, error: error.message };

  await logPlatformAudit({
    operatorId: auth.userId,
    action: "feature.toggle",
    targetType: "feature_flag",
    targetId: parsed.data.flagId,
    metadata: { enabled: parsed.data.enabled },
  });

  revalidatePath("/platform/features");
  return { ok: true };
}
