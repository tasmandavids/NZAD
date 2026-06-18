"use client";

import { motion } from "framer-motion";
import { OluneLogo } from "@/components/brand/OluneLogo";
import { LandingHero } from "./landing/LandingHero";
import { LandingNav, LandingFooter, SectionShell, Eyebrow, ProductDemo, PrimaryButton, SecondaryButton } from "./landing/ui";
import { container, rise, fadeIn } from "./landing/motion";

const WHY_CHOOSE = [
  {
    title: "Faster than the patchwork",
    body: "Stop stitching together a PM tool, an accounting app, a website builder, and a dozen tabs. Olune does it in one — which means less switching, fewer dropped balls, and hours back every week.",
  },
  {
    title: "Better value than the stack",
    body: "Replace three or four subscriptions with one fair price. You get more, you pay less, and you always know what it costs — no surprise tiers, no nickel-and-diming.",
  },
  {
    title: "Made with real craft",
    body: "Built by people who actually understand studios. Every screen is fast, clean, and thought-through — the kind of tool you're glad to open, not the one you dread.",
  },
];

const EVERYDAY = [
  { title: "Mornings start calm", body: "Open Olune and the day lays itself out — no hunting across apps." },
  { title: "Money makes sense", body: "Send an invoice, log an expense, see the impact instantly." },
  { title: "Clients stay happy", body: "Edit their site live on a call and watch their face light up." },
  { title: "Evenings come back", body: "When the admin runs itself, your free time stops being a fantasy." },
];

const PRICING = [
  {
    name: "Solo",
    tag: "for the one-person studio",
    price: "$19",
    desc: "Everything you need to run projects, send invoices, and manage one client site. Perfect for freelancers who wear every hat.",
    popular: false,
  },
  {
    name: "Studio",
    tag: "most popular",
    price: "$49",
    desc: "For small teams. Unlimited projects, full financial suite, live website building for up to 10 client sites, and team access.",
    popular: true,
  },
  {
    name: "Scale",
    tag: "for growing studios",
    price: "$99",
    desc: "Unlimited everything — sites, team members, and clients — plus priority support and advanced financial reporting.",
    popular: false,
  },
];

const COMPARE_ROWS = [
  { label: "Projects", stack: "One app", olune: "Built in" },
  { label: "Invoicing & finances", stack: "A second app", olune: "Built in" },
  { label: "Live website building", stack: "A third app", olune: "Built in, real-time" },
  { label: "Everything in sync", stack: "Manual, error-prone", olune: "Automatic" },
  { label: "Monthly cost", stack: "$80–150+ combined", olune: "From $19" },
  { label: "Tools to learn", stack: "3–4", olune: "1" },
  { label: "Made for studios", stack: "Generic", olune: "Purpose-built" },
];

export default function OluneLanding() {
  return (
    <div className="relative min-h-screen scroll-smooth bg-paper text-ink-black">
      <LandingNav />
      <LandingHero />

      {/* ── The problem ─────────────────────────────────────────────── */}
      <SectionShell
        className="bg-gradient-to-b from-ivory via-paper to-ivory"
      >
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
        >
          <Eyebrow>The human bit</Eyebrow>
          <motion.h2
            variants={rise}
            className="max-w-[18ch] font-display text-[clamp(2rem,5vw,3.5rem)] font-light leading-tight tracking-tight"
          >
            You didn&apos;t start a studio to do admin.
          </motion.h2>
          <motion.p variants={rise} className="mt-6 max-w-[58ch] text-lg leading-relaxed text-slate">
            You started it to make great work. But somewhere between the invoices, the project
            trackers, the client website edits, and the &ldquo;quick question&rdquo; emails, the work
            you love got buried under the work you don&apos;t.
          </motion.p>
          <motion.p variants={rise} className="mt-4 max-w-[58ch] text-lg leading-relaxed text-ink-black/80">
            Olune pulls all of it into one place — and quietly does the heavy lifting in the
            background, so your evenings are yours again.
          </motion.p>
        </motion.div>
      </SectionShell>

      {/* ── What Olune does ─────────────────────────────────────────── */}
      <SectionShell id="features" className="bg-paper">
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="mb-[clamp(3rem,8vw,5rem)]"
        >
          <Eyebrow>What Olune does</Eyebrow>
          <motion.h2 variants={rise} className="font-display text-[clamp(2rem,5vw,3.5rem)] font-light tracking-tight">
            Three jobs.{" "}
            <span className="font-serif italic text-iris">One home.</span>
          </motion.h2>
        </motion.div>

        <div className="space-y-[clamp(4rem,10vw,7rem)]">
          <ProductDemo
            title="Manage the studio"
            subtitle="Every project, deadline, client, and task in one clear view. Know exactly what's due, what's slipping, and what's done — without the morning panic."
            accent="iris"
          />
          <ProductDemo
            title="Stay on top of the money"
            subtitle="Quotes, invoices, expenses, and cash flow built right in. Watch what's coming in and going out in real time, so the financial side stops being a once-a-quarter fright."
            reversed
            accent="apricot"
          />
          <ProductDemo
            title="Build and update sites live"
            subtitle="Spin up and edit client websites in real time, right inside Olune. No bouncing between platforms, no waiting on a developer for a copy change — see it change as you type."
            accent="lumen"
          />
        </div>
      </SectionShell>

      {/* ── Why studios choose Olune ────────────────────────────────── */}
      <SectionShell dark className="text-white">
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="relative z-10"
        >
          <div className="mb-[clamp(2.5rem,6vw,4rem)]">
            <div className="mb-[clamp(1rem,2.5vw,1.6rem)] inline-flex items-center gap-4 text-[clamp(.62rem,1.4vw,.72rem)] font-medium uppercase tracking-[0.36em] text-white/50">
              <span className="h-px w-12 bg-lumen/60" />
              Why studios choose Olune
            </div>
            <motion.h2 variants={rise} className="font-display text-[clamp(2rem,5vw,3.25rem)] font-light tracking-tight text-white">
              Faster. Cheaper.{" "}
              <span className="font-serif italic text-lumen">Better made.</span>
            </motion.h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {WHY_CHOOSE.map((item, i) => (
              <motion.div
                key={item.title}
                variants={fadeIn}
                custom={i}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-7 backdrop-blur-sm"
              >
                <h3 className="text-sm font-bold uppercase tracking-wide text-lumen">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/70">{item.body}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </SectionShell>

      {/* ── The everyday difference ─────────────────────────────────── */}
      <SectionShell className="bg-gradient-to-b from-ivory to-paper">
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
        >
          <Eyebrow>The everyday difference</Eyebrow>
          <motion.h2 variants={rise} className="mb-12 font-display text-[clamp(2rem,5vw,3.25rem)] font-light tracking-tight">
            What changes when everything lives in one place
          </motion.h2>

          <div className="grid gap-5 sm:grid-cols-2">
            {EVERYDAY.map((item, i) => (
              <motion.div
                key={item.title}
                variants={fadeIn}
                custom={i}
                className="group relative overflow-hidden rounded-2xl border border-ink-black/[0.07] bg-paper p-7 shadow-[0_2px_24px_-8px_rgba(0,0,0,.06)] transition-shadow hover:shadow-[0_8px_40px_-12px_rgba(107,102,201,.15)]"
              >
                <div
                  className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-0 blur-2xl transition-opacity group-hover:opacity-100"
                  style={{ background: "radial-gradient(circle, rgba(107,102,201,.2), transparent 70%)" }}
                  aria-hidden
                />
                <h3 className="relative text-base font-bold text-ink-black">{item.title}</h3>
                <p className="relative mt-2 text-sm leading-relaxed text-slate">{item.body}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </SectionShell>

      {/* ── The promise ─────────────────────────────────────────────── */}
      <SectionShell className="relative overflow-hidden bg-midnight text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(60vmax 50vmax at 50% 50%, rgba(107,102,201,.25), transparent 65%)",
          }}
          aria-hidden
        />
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="relative z-10 text-center"
        >
          <motion.div variants={rise} className="mb-6 flex justify-center">
            <OluneLogo theme="dark" variant="mark" size="lg" />
          </motion.div>
          <motion.p variants={rise} className="text-[0.68rem] font-medium uppercase tracking-[0.3em] text-lumen/80">
            The promise
          </motion.p>
          <motion.h2
            variants={rise}
            className="mx-auto mt-4 max-w-[16ch] font-display text-[clamp(2.2rem,6vw,4rem)] font-light leading-tight tracking-tight"
          >
            More making.{" "}
            <span className="font-serif italic text-lumen">Less managing.</span>
          </motion.h2>
          <motion.p variants={rise} className="mx-auto mt-6 max-w-[52ch] text-lg leading-relaxed text-white/70">
            Olune isn&apos;t here to add another tab to your day. It&apos;s here to quietly take the
            weight — the projects, the finances, the websites — so you can get back to the work
            that made you start in the first place.
          </motion.p>
          <motion.div variants={rise} className="mt-10 flex flex-col items-center gap-3">
            <PrimaryButton href="/onboarding" className="bg-white text-ink-black hover:bg-lumen">
              Start your free trial
            </PrimaryButton>
            <p className="text-sm text-white/50">No card needed. Set up in minutes.</p>
          </motion.div>
        </motion.div>
      </SectionShell>

      {/* ── Pricing ─────────────────────────────────────────────────── */}
      <SectionShell id="pricing" className="bg-ivory">
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
        >
          <Eyebrow>Pricing</Eyebrow>
          <motion.h2 variants={rise} className="font-display text-[clamp(2rem,5vw,3.25rem)] font-light tracking-tight">
            Fair pricing.{" "}
            <span className="font-serif italic text-iris">No surprises.</span>
          </motion.h2>
          <motion.p variants={rise} className="mt-4 max-w-[52ch] text-lg text-slate">
            One plan replaces your project tool, your accounting app, and your website builder.
            Pay for one thing, not four.
          </motion.p>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {PRICING.map((plan, i) => (
              <motion.div
                key={plan.name}
                variants={fadeIn}
                custom={i}
                className={`relative flex flex-col rounded-2xl border p-8 ${
                  plan.popular
                    ? "border-iris/40 bg-paper shadow-[0_20px_60px_-20px_rgba(107,102,201,.25)]"
                    : "border-ink-black/[0.08] bg-paper/80"
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-6 rounded-full bg-iris px-3 py-1 text-[0.6rem] font-bold uppercase tracking-widest text-white">
                    Most popular
                  </span>
                )}
                <p className="text-sm font-bold uppercase tracking-wide text-ink-black">{plan.name}</p>
                <p className="mt-1 text-xs italic text-slate">{plan.tag}</p>
                <p className="mt-6 font-display text-4xl font-light tracking-tight">
                  {plan.price}
                  <span className="text-base text-slate">/mo</span>
                </p>
                <p className="mt-4 flex-1 text-sm leading-relaxed text-slate">{plan.desc}</p>
                <a
                  href="/onboarding"
                  className={`mt-8 inline-flex justify-center rounded-full px-6 py-3 text-xs font-bold uppercase tracking-wide transition-colors ${
                    plan.popular
                      ? "bg-ink-black text-paper hover:bg-iris"
                      : "border border-ink-black/15 bg-paper text-ink-black hover:border-iris/40"
                  }`}
                >
                  Start free
                </a>
              </motion.div>
            ))}
          </div>

          <motion.div variants={rise} className="mt-10 rounded-xl border border-iris/20 bg-paper/60 p-6 backdrop-blur-sm">
            <p className="text-sm leading-relaxed text-slate">
              <span className="font-semibold text-ink-black">Every plan includes:</span>{" "}
              real-time website building, integrated invoicing &amp; expenses, project management,
              and free updates. No setup fees. No card to start. Cancel anytime.
            </p>
            <blockquote className="mt-4 border-l-2 border-iris/30 pl-4 text-sm italic text-ink-black/80">
              <strong>The honest math:</strong> A PM tool, an accounting app, and a website builder
              usually run $80–150/month combined. Olune does all three from $19.
            </blockquote>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <PrimaryButton href="/onboarding">Start free</PrimaryButton>
              <span className="text-sm text-slate">14 days, no card needed.</span>
            </div>
          </motion.div>
        </motion.div>
      </SectionShell>

      {/* ── About ───────────────────────────────────────────────────── */}
      <SectionShell id="about" className="bg-gradient-to-br from-paper via-ivory to-mist/30">
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="grid items-center gap-12 lg:grid-cols-2"
        >
          <div>
            <Eyebrow>About us</Eyebrow>
            <motion.h2 variants={rise} className="font-display text-[clamp(2rem,5vw,3rem)] font-light leading-tight tracking-tight">
              Built by studio people,{" "}
              <span className="font-serif italic text-iris">for studio people.</span>
            </motion.h2>
            <motion.p variants={rise} className="mt-6 text-lg leading-relaxed text-slate">
              We&apos;ve run studios. We know the 11pm invoice scramble, the client website that&apos;s
              always a step behind, the spreadsheet that only one person understands. We got tired
              of duct-taping five tools together and hoping nothing fell through the cracks.
            </motion.p>
            <motion.p variants={rise} className="mt-4 text-lg leading-relaxed text-slate">
              So we built the thing we wished we had — one calm system that holds the projects,
              the money, and the websites together, and does the busywork quietly in the background.
            </motion.p>
            <motion.p variants={rise} className="mt-4 font-medium text-ink-black">
              Olune exists for one reason: to give creative people their time back. Less managing.
              More making. That&apos;s the whole idea.
            </motion.p>
            <motion.div variants={rise} className="mt-8 flex flex-wrap gap-4">
              <SecondaryButton href="#about">Meet the team</SecondaryButton>
              <SecondaryButton href="#about">Our story</SecondaryButton>
            </motion.div>
          </div>

          <motion.div
            variants={rise}
            className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-ink-black/[0.08] shadow-[0_24px_80px_-24px_rgba(0,0,0,.12)]"
          >
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(135deg, rgba(107,102,201,.15) 0%, rgba(242,183,136,.12) 50%, rgba(250,248,243,1) 100%)",
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center p-10">
              <p className="max-w-[28ch] text-center font-display text-[clamp(1.5rem,3vw,2rem)] font-light leading-snug tracking-tight text-ink-black/90">
                &ldquo;Less managing. More making.&rdquo;
              </p>
            </div>
          </motion.div>
        </motion.div>
      </SectionShell>

      {/* ── Comparison ──────────────────────────────────────────────── */}
      <SectionShell id="compare" className="bg-paper">
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
        >
          <Eyebrow>Compare</Eyebrow>
          <motion.h2 variants={rise} className="font-display text-[clamp(2rem,5vw,3.25rem)] font-light tracking-tight">
            Why studios switch to Olune
          </motion.h2>
          <motion.p variants={rise} className="mt-4 max-w-[58ch] text-lg text-slate">
            Most studios run on a patchwork — a project tool here, an accounting app there, a
            separate website builder, and a pile of spreadsheets holding it together. It works,
            until it doesn&apos;t.
          </motion.p>

          <motion.div
            variants={rise}
            className="mt-10 overflow-hidden rounded-2xl border border-ink-black/[0.08] shadow-[0_2px_24px_-8px_rgba(0,0,0,.06)]"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[540px] text-left text-sm">
                <thead>
                  <tr className="border-b border-ink-black/[0.08] bg-ivory/80">
                    <th className="px-6 py-4 font-medium text-slate" scope="col" />
                    <th className="px-6 py-4 font-bold uppercase tracking-wide text-slate" scope="col">
                      The usual stack
                    </th>
                    <th className="px-6 py-4 font-bold uppercase tracking-wide text-iris" scope="col">
                      <OluneLogo size="xs" className="inline-flex" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARE_ROWS.map((row, i) => (
                    <tr
                      key={row.label}
                      className={i % 2 === 0 ? "bg-paper" : "bg-ivory/40"}
                    >
                      <th className="px-6 py-4 font-semibold text-ink-black" scope="row">
                        {row.label}
                      </th>
                      <td className="px-6 py-4 text-slate">{row.stack}</td>
                      <td className="px-6 py-4 font-medium text-ink-black">
                        <span className="text-iris">✓</span> {row.olune}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          <motion.div variants={rise} className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              { k: "Faster", v: "No switching between apps or re-entering the same data three times." },
              { k: "Cheaper", v: "One fair price instead of four subscriptions." },
              { k: "Better made", v: "Every screen built for how studios actually work, not bolted on after." },
            ].map((item) => (
              <div key={item.k} className="rounded-xl border border-ink-black/[0.06] bg-ivory/50 p-5">
                <p className="text-sm font-bold text-iris">{item.k}</p>
                <p className="mt-1 text-sm text-slate">{item.v}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </SectionShell>

      <LandingFooter />
    </div>
  );
}
