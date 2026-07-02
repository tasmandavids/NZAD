// Marketing landing — studio-aware.
// Root domain (localhost:3000 / olune.app) → Olune platform marketing page.
// Studio subdomain (nzad.localhost:3000) → that studio's branded cinematic hero.

import dynamic from "next/dynamic";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { resolveStudio } from "@/lib/tenant";
import { getBrandingCached } from "@/lib/branding";
import { getPublishedHomeCached } from "@/lib/site/cached-queries";
import { PublicSite } from "@/components/site/PublicSite";
import { PoweredByOlune } from "@/components/brand/PoweredByOlune";
import Hero from "@/components/marketing/Hero";
import { ClientParticleBackground } from "@/components/landing/ClientParticleBackground";

const OluneLanding = dynamic(() => import("@/components/marketing/OluneLanding"));

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; next?: string }>;
}) {
  const host = (await headers()).get("host");
  const studio = await resolveStudio(host);

  // Safety net: if Supabase ever lands an OAuth redirect on the home page
  // (e.g. a host not yet in the redirect allow-list falls back to the Site
  // URL with ?code=…), hand it to the callback route so the code is actually
  // exchanged instead of silently rendering the marketing page.
  const { code, next } = await searchParams;
  if (code) {
    const params = new URLSearchParams({ code });
    if (next) params.set("next", next);
    redirect(`/auth/callback?${params.toString()}`);
  }

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
      <ClientParticleBackground variant="light" />
      <Hero studioName={studio.name} tagline={branding.tagline} />
      <div className="pointer-events-none absolute bottom-[4.75rem] left-[clamp(1.25rem,4vw,4rem)] z-20">
        <PoweredByOlune />
      </div>
    </div>
  );
}
