"use client";

import dynamic from "next/dynamic";

const ParticleBackground = dynamic(
  () => import("@/components/landing/ParticleBackground").then((m) => m.ParticleBackground),
  { ssr: false },
);

export function ClientParticleBackground(props: React.ComponentProps<typeof ParticleBackground>) {
  return <ParticleBackground {...props} />;
}
