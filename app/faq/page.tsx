"use client";

// ============================================================================
//  app/faq/page.tsx — Olune platform marketing FAQ.
//  Content sourced from the Claude Design Studio export; English only for
//  now (rest of the marketing site is translated, this page isn't yet).
// ============================================================================

import { useState } from "react";
import { landingFontVars } from "@/components/marketing/landing/fonts";
import { LandingNav, LandingFooter, SectionShell, Eyebrow, PrimaryButton, DevBanner } from "@/components/marketing/landing/ui";

type FaqItem = { q: string; a: string };
type FaqCategory = { label: string; items: FaqItem[] };

const CATEGORIES: FaqCategory[] = [
  {
    label: "What Olune does",
    items: [
      {
        q: "What is Olune?",
        a: "Olune is one home for running a creative studio or freelance business: projects and tasks, quotes, invoices, expenses and cash flow, plus live client websites — all behind one login. Instead of stitching four tools together, everything lives in one calm place and stays in sync automatically.",
      },
      {
        q: "Who is Olune for?",
        a: "Freelancers, small studios and agencies who juggle client work, money and websites. If you run projects, send invoices and look after client sites, Olune was built for your week.",
      },
      {
        q: "What does Olune replace?",
        a: "Typically a project-management tool, an accounting or invoicing app, a website builder, and the spreadsheets holding it all together. One subscription, one login, no copy-pasting data between apps.",
      },
      {
        q: "Do my clients need an Olune account?",
        a: "No. Quotes and invoices arrive as simple links your clients can view, accept and pay. Their websites are just live websites — no logins or portals for them to learn.",
      },
    ],
  },
  {
    label: "Pricing & plans",
    items: [
      {
        q: "How much does Olune cost?",
        a: "Plans start at $19/month for Solo, $49/month for Studio, and $99/month for Scale. For comparison, a separate PM tool, accounting app and website builder usually run $80–150/month combined.",
      },
      {
        q: "Is there a free trial?",
        a: "Better — Olune is completely free to use as much as you like until general release in early August. After that, every plan starts with 14 days free and no card is needed to sign up.",
      },
      {
        q: "Can I change plans or cancel?",
        a: "Anytime. Upgrade, downgrade or cancel from your settings in a couple of clicks — no lock-in contracts, no cancellation fees.",
      },
      {
        q: "Are there setup fees or hidden costs?",
        a: "No. The plan price is the whole price. Hosting for your client sites is included, and updates ship free to every plan.",
      },
    ],
  },
  {
    label: "Websites & connections",
    items: [
      {
        q: "How does live site building work?",
        a: "You build and edit client sites right inside Olune, and every change publishes the moment you make it — no staging environments, no deploys, no waiting on a developer for a copy change. Edit on a call and the client sees it refresh in real time.",
      },
      {
        q: "Can I connect my own domain?",
        a: "Yes. Point your domain (or your client's) at Olune and the site goes live on it, SSL certificate included. Every site also gets an olune.co.nz address so you can share work before the domain is ready.",
      },
      {
        q: "Is hosting included?",
        a: "Yes — fast, managed hosting is included on every plan for every site you build. Nothing extra to configure or pay for.",
      },
      {
        q: "How do payments and accounting connect?",
        a: "Invoices can be paid online by card or bank transfer, and payments are matched off automatically so your cash flow view is always current. Come tax time, export everything as CSV for your accountant.",
      },
      {
        q: "Can I get my data out?",
        a: "Always. Your projects, invoices, contacts and site content are yours — export them anytime, no questions asked.",
      },
    ],
  },
];

function FaqAccordionItem({ item, defaultOpen = false }: { item: FaqItem; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-landing-navy/[0.09] py-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-6 text-left"
      >
        <span className="text-[17px] font-semibold text-landing-navy">{item.q}</span>
        <span
          aria-hidden
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-landing-navy/[0.06] text-lg text-landing-navy transition-transform duration-300 ${open ? "rotate-45" : ""}`}
        >
          +
        </span>
      </button>
      {open && <p className="mt-4 max-w-[720px] text-[15.5px] leading-relaxed text-landing-navy/62">{item.a}</p>}
    </div>
  );
}

export default function FaqPage() {
  return (
    <div className={`${landingFontVars} relative min-h-screen scroll-smooth bg-landing-paper font-[family-name:var(--font-landing-body)] text-landing-navy`}>
      <DevBanner />
      <LandingNav />

      <SectionShell className="bg-gradient-to-b from-landing-ivory to-landing-paper pb-16 pt-[clamp(3rem,7vw,5rem)] text-center">
        <Eyebrow>FAQ</Eyebrow>
        <h1 className="font-[family-name:var(--font-landing-display)] mx-auto max-w-[760px] text-[clamp(40px,6vw,84px)] font-medium leading-[1.05] tracking-[-0.02em] text-landing-navy">
          Questions, <span className="italic text-landing-accent">answered.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-[560px] text-lg leading-relaxed text-landing-navy/60">
          What Olune does, what it costs, and how everything connects. Can&rsquo;t find your answer? Email{" "}
          <a href="mailto:hello@olune.co.nz" className="font-semibold text-landing-navy underline decoration-landing-accent/50 underline-offset-4 hover:text-landing-accent">
            hello@olune.co.nz
          </a>
          .
        </p>
      </SectionShell>

      <SectionShell className="bg-landing-paper pt-0">
        <div className="mx-auto max-w-[820px] space-y-16">
          {CATEGORIES.map((category, ci) => (
            <div key={category.label}>
              <div className="mb-2 flex items-center gap-2.5 text-[13px] font-bold uppercase tracking-[0.14em] text-landing-navy/46">
                <span className="h-1.5 w-1.5 rounded-full bg-landing-accent" />
                {category.label.toUpperCase()}
              </div>
              <div>
                {category.items.map((item, i) => (
                  <FaqAccordionItem key={item.q} item={item} defaultOpen={ci === 0 && i === 0} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-24 max-w-[640px] text-center">
          <h2 className="font-[family-name:var(--font-landing-display)] text-[clamp(28px,3.4vw,42px)] font-medium leading-[1.1] tracking-[-0.015em] text-landing-navy">
            Still curious? Just try it.
          </h2>
          <p className="mx-auto mt-4 max-w-[480px] text-base leading-relaxed text-landing-navy/56">
            Everything is free to use until general release in early August — the fastest way to see if Olune fits your studio.
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
