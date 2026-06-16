// ============================================================================
//  /portal/admin/settings — Studio settings page.
//  Shows studio identity (name, slug, status) and allows editing the name.
// ============================================================================

import { createClient } from "@/lib/supabase/server";
import AdminSettings from "@/components/admin/AdminSettings";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("studio_id")
    .eq("id", user!.id)
    .single();

  const { data: studio } = profile?.studio_id
    ? await supabase
        .from("studios")
        .select("id, name, slug, custom_domain, status, created_at, sibling_discount_pct, family_discount_on_retail, timezone")
        .eq("id", profile.studio_id)
        .single()
    : { data: null };

  return (
    <AdminSettings
      studio={
        studio
          ? {
              id: studio.id,
              name: studio.name,
              slug: studio.slug,
              customDomain: studio.custom_domain,
              status: studio.status,
              createdAt: studio.created_at,
              siblingDiscountPct: studio.sibling_discount_pct ?? 0,
              familyDiscountOnRetail: studio.family_discount_on_retail ?? false,
              timezone: studio.timezone ?? "Pacific/Auckland",
            }
          : null
      }
    />
  );
}
