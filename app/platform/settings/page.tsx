import { createAdminClient } from "@/lib/supabase/admin";
import { PlatformSettingsForm } from "@/components/platform/PlatformSettingsForm";
import type { PlatformSettings } from "@/lib/platform/types";

export default async function PlatformSettingsPage() {
  const admin = createAdminClient();
  const { data } = await admin.from("platform_settings").select("settings").eq("id", 1).single();

  const settings = (data?.settings as PlatformSettings) ?? {};

  return <PlatformSettingsForm settings={settings} />;
}
