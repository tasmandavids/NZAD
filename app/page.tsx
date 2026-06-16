// Marketing landing — studio-aware.
// Root domain (localhost:3000 / olune.app) → Olune platform marketing page.
// Studio subdomain (nzad.localhost:3000) → that studio's branded cinematic hero.

import { headers } from "next/headers";
import { resolveStudio } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { getBranding } from "@/lib/branding";
import { ParticleBackground } from "@/components/landing/ParticleBackground";
import Hero from "@/components/marketing/Hero";
import OluneLanding from "@/components/marketing/OluneLanding";

export default async function HomePage() {
  const host = (await headers()).get("host");
  const studio = await resolveStudio(host);

  if (!studio) {
    // Root / apex domain — show the Olune platform page.
    return <OluneLanding />;
  }

  // Studio subdomain — show that studio's branded hero.
  const supabase = await createClient();
  const branding = await getBranding(supabase, studio.id);

  return (
    <>
      <ParticleBackground />
      <Hero studioName={studio.name} tagline={branding.tagline} />
    </>
  );
}
