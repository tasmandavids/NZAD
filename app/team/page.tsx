// ============================================================================
//  app/team/page.tsx — Founder story for the Olune platform marketing site.
//  Content sourced from the Claude Design Studio export; English only for
//  now (rest of the marketing site is translated, this page isn't yet).
// ============================================================================

import { landingFontVars } from "@/components/marketing/landing/fonts";
import { LandingNav, LandingFooter, SectionShell, Eyebrow, PrimaryButton, DevBanner } from "@/components/marketing/landing/ui";

const PRINCIPLES = [
  { t: "Studio-run", d: "Built by someone who's actually lived the freelance week." },
  { t: "Calm by design", d: "Every screen made to open, not dread." },
  { t: "All in one", d: "Projects, money and sites, together." },
] as const;

export default function TeamPage() {
  return (
    <div className={`${landingFontVars} relative min-h-screen scroll-smooth bg-landing-paper font-[family-name:var(--font-landing-body)] text-landing-navy`}>
      <DevBanner />
      <LandingNav />

      <SectionShell className="bg-gradient-to-b from-landing-ivory to-landing-paper pb-10 pt-[clamp(3rem,7vw,5rem)] text-center">
        <Eyebrow>Meet the team</Eyebrow>
        <h1 className="font-[family-name:var(--font-landing-display)] mx-auto max-w-[720px] text-[clamp(38px,5.6vw,72px)] font-medium leading-[1.08] tracking-[-0.02em] text-landing-navy">
          The person behind <span className="italic text-landing-accent">Olune.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-[540px] text-lg leading-relaxed text-landing-navy/60">
          Olune isn&rsquo;t built by a boardroom. It&rsquo;s built hands-on, every day, by someone who lived the problem it solves.
        </p>
      </SectionShell>

      <SectionShell className="bg-landing-paper pt-0">
        <div className="mx-auto grid max-w-[1040px] items-start gap-16 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <span className="flex h-32 w-32 items-center justify-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#6b66c9,#1a1535)] font-[family-name:var(--font-landing-display)] text-4xl italic text-white shadow-[0_30px_60px_-24px_rgba(139,124,240,0.6)]">
              TD
            </span>
            <p className="mt-6 font-[family-name:var(--font-landing-display)] text-[24px] text-landing-navy">Tasman Davids</p>
            <p className="mt-1 text-[13px] font-bold uppercase tracking-[0.14em] text-landing-accent">Founder</p>
            <p className="mt-1 text-sm text-landing-navy/56">New Zealand</p>
          </div>

          <div>
            <h2 className="font-[family-name:var(--font-landing-display)] mb-6 text-[clamp(28px,3.2vw,40px)] font-medium leading-[1.1] tracking-[-0.015em] text-landing-navy">
              Why Olune exists
            </h2>
            <p className="mb-5 text-[17px] leading-relaxed text-landing-navy/64">
              Olune started with frustration. Running client work meant living inside a patchwork — a project tool over here, an invoicing app over there, a website builder somewhere else, and spreadsheets quietly holding the whole thing together.
            </p>
            <p className="mb-5 text-[17px] leading-relaxed text-landing-navy/64">
              The breaking point is familiar to anyone who&rsquo;s freelanced: evenings lost to chasing invoices, re-entering the same numbers in three places, and client websites where a one-line copy change meant waiting on a developer. Four subscriptions, none of them talking to each other — and the creative work getting buried under the admin.
            </p>
            <p className="mb-9 text-[17px] leading-relaxed text-landing-navy/64">
              So Tasman stopped duct-taping and started building. Olune is the result: one calm home for the projects, the money, and the live client sites — built in New Zealand and shaped daily by the people using it.
            </p>

            <div className="mb-10 flex items-center gap-5 rounded-2xl border border-landing-navy/5 bg-white px-7 py-7 shadow-[0_30px_70px_-46px_rgba(26,21,53,0.45)]">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-landing-navy text-white drop-shadow-[0_6px_16px_rgba(139,124,240,0.5)]">
                ✦
              </span>
              <p className="font-[family-name:var(--font-landing-display)] text-[clamp(20px,2.2vw,26px)] italic leading-tight text-landing-navy">
                &ldquo;I built Olune because the admin was eating the work I actually loved.&rdquo;
              </p>
            </div>

            <div className="grid grid-cols-1 gap-7 border-t border-landing-navy/[0.14] pt-10 sm:grid-cols-3">
              {PRINCIPLES.map((p) => (
                <div key={p.t}>
                  <div className="mb-2 font-[family-name:var(--font-landing-display)] text-[20px] italic text-landing-accent">{p.t}</div>
                  <p className="text-sm leading-relaxed text-landing-navy/56">{p.d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mx-auto mt-24 max-w-[640px] text-center">
          <h2 className="font-[family-name:var(--font-landing-display)] text-[clamp(28px,3.4vw,42px)] font-medium leading-[1.1] tracking-[-0.015em] text-landing-navy">
            Follow the build.
          </h2>
          <p className="mx-auto mt-4 max-w-[480px] text-base leading-relaxed text-landing-navy/56">
            Olune ships in the open — try it free before general release in early August and help shape where it goes next.
          </p>
          <div className="mt-8">
            <PrimaryButton href="/onboarding">Start free</PrimaryButton>
            <p className="mt-4 text-sm text-landing-navy/48">No card needed. Set up in minutes.</p>
          </div>
        </div>
      </SectionShell>

      <LandingFooter />
    </div>
  );
}
