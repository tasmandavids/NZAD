// Server component: load the signed-in admin's studio branding, hand it to the
// client editor. The portal layout (not shown in this slice) already asserts
// role === 'admin'; this page assumes that guard has run.

import { createClient } from "@/lib/supabase/server";
import { getBranding, DEFAULT_BRANDING } from "@/lib/branding";
import { BrandingEditor } from "@/components/admin/BrandingEditor";

export default async function BrandingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("profiles").select("studio_id").eq("id", user.id).single()
    : { data: null };

  const branding = profile?.studio_id
    ? await getBranding(supabase, profile.studio_id)
    : DEFAULT_BRANDING;

  return <BrandingEditor initial={branding} />;
}
