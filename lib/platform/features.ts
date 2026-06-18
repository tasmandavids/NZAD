// Check whether a feature is enabled globally or for a specific studio.

import { createAdminClient } from "@/lib/supabase/admin";

export async function isFeatureEnabled(
  featureKey: string,
  studioId?: string | null,
): Promise<boolean> {
  const admin = createAdminClient();

  if (studioId) {
    const { data: override } = await admin
      .from("platform_feature_flags")
      .select("enabled")
      .eq("feature_key", featureKey)
      .eq("studio_id", studioId)
      .maybeSingle();
    if (override) return override.enabled;
  }

  const { data: global } = await admin
    .from("platform_feature_flags")
    .select("enabled")
    .eq("feature_key", featureKey)
    .is("studio_id", null)
    .maybeSingle();

  return global?.enabled ?? false;
}

export async function getPlatformSettings(): Promise<Record<string, unknown>> {
  const admin = createAdminClient();
  const { data } = await admin.from("platform_settings").select("settings").eq("id", 1).single();
  return (data?.settings as Record<string, unknown>) ?? {};
}
