// Marketing landing — studio-aware.
// Root domain (localhost:3000 / olune.app) → Olune platform marketing page.
// Studio subdomain (nzad.localhost:3000) → that studio's branded cinematic hero.

import dynamic from "next/dynamic";
import { headers } from "next/headers";
import { resolveStudio } from "@/lib/tenant";
import { getBrandingCached } from "@/lib/branding";
import { getPublishedHomeCached } from "@/lib/site/cached-queries";
import { PublicSite } from "@/components/site/PublicSite";
import { PoweredByOlune } from "@/components/brand/PoweredByOlune";
import Hero from "@/components/marketing/Hero";

const OluneLanding = dynamic(() => import("@/components/marketing/OluneLanding"));

const ParticleBackground = dynamic(
  () => import("@/components/landing/ParticleBackground").then((m) => m.ParticleBackground),
  { ssr: false },
);

export default async function HomePage() {
  const host = (await headers()).get("host");
  const studio = await resolveStudio(host);

  if (!studio) {
    // Root / apex domain — show the Olune platform page.
    return <OluneLanding />;
  }

  // If the studio has built and published a custom homepage, render it.
  const home = await getPublishedHomeCached(studio.id);
  if (home) {
    return <PublicSite studio={{ id: studio.id, name: studio.name }} page={home} />;
  }

  // Fallback — studio hasn't published a homepage yet: branded hero.
  const branding = await getBrandingCached(studio.id);

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
