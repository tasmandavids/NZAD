// ============================================================================
//  /enrol — "Book a free trial" landing page.
//  Resolves the studio from the subdomain so it can show the studio's branding.
//  A real implementation would embed a class-picker + Stripe payment initiation;
//  this stub captures interest and redirects to signup.
// ============================================================================

import { headers } from "next/headers";
import { resolveStudio } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { getBranding, DEFAULT_BRANDING } from "@/lib/branding";
import EnrolPage from "@/components/marketing/EnrolPage";

export default async function EnrolRoute() {
  const host = (await headers()).get("host");
  const studio = await resolveStudio(host);

  const supabase = await createClient();
  const branding = studio
    ? await getBranding(supabase, studio.id)
    : { ...DEFAULT_BRANDING };

  return (
    <EnrolPage
      studioName={studio?.name ?? "Olune Studio"}
      tagline={branding.tagline}
      logoUrl={branding.logoUrl}
    />
  );
}
