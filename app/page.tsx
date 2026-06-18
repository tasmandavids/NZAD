// Marketing landing — studio-aware.
// Root domain (localhost:3000 / olune.app) → Olune platform marketing page.
// Studio subdomain (nzad.localhost:3000) → that studio's branded cinematic hero.

import { headers } from "next/headers";
import { resolveStudio } from "@/lib/tenant";
import { createPublicClient } from "@/lib/supabase/public";
import { getBranding } from "@/lib/branding";
import { getPublishedHome } from "@/lib/site/queries";
import { PublicSite } from "@/components/site/PublicSite";
import { ParticleBackground } from "@/components/landing/ParticleBackground";
import { PoweredByOlune } from "@/components/brand/PoweredByOlune";
import Hero from "@/components/marketing/Hero";
import OluneLanding from "@/components/marketing/OluneLanding";

export default async function HomePage() {
  const host = (await headers()).get("host");
  const studio = await resolveStudio(host);

  if (!studio) {
    // Root / apex domain — show the Olune platform page.
    return <OluneLanding />;
  }

  // If the studio has built and published a custom homepage, render it.
  const home = await getPublishedHome(studio.id);
  if (home) {
    return <PublicSite studio={{ id: studio.id, name: studio.name }} page={home} />;
  }

  // Fallback — studio hasn't published a homepage yet: branded hero.
  const supabase = createPublicClient();
  const branding = await getBranding(supabase, studio.id);

  return (
    <div className="relative min-h-screen">
      <ParticleBackground variant="light" />
      <Hero studioName={studio.name} tagline={branding.tagline} />
      <div className="pointer-events-none absolute bottom-[4.75rem] left-[clamp(1.25rem,4vw,4rem)] z-20">
        <PoweredByOlune />
      </div>
    </div>
  );
}
