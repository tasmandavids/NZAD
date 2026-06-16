"use client";

// ============================================================================
//  OluneLanding — The Olune platform marketing page.
//  Shown on the root domain (localhost:3000 / olune.app).
//  Studio subdomains show the studio's own Hero instead.
// ============================================================================

import { motion } from "framer-motion";
import { ParticleBackground } from "@/components/landing/ParticleBackground";

const container: import("framer-motion").Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

const rise: import("framer-motion").Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
};

const FEATURES = [
  {
    icon: "◈",
    label: "Your Brand",
    desc: "Pick one colour. We derive the full palette — dark/light modes, button states, hover glows. Looks custom-built for your studio.",
  },
  {
    icon: "↺",
    label: "Four Portals",
    desc: "Admin schedules, teachers roll-call, parents pay, students timetable. Everyone sees exactly what's theirs — nothing more.",
  },
  {
    icon: "✦",
    label: "Live Roll Call",
    desc: "Present, absent, late, excused — one tap per student. Optimistic updates, instant feedback, automatic history.",
  },
  {
    icon: "◻",
    label: "Invoicing",
    desc: "Term fees, one-off charges, outstanding balances. Clean invoice tables your parents will actually read and pay.",
  },
];

export default function OluneLanding() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-void text-chalk">
      {/* Particle field same as studio pages — keeps the brand consistent */}
      <ParticleBackground />

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <nav className="relative z-20 flex items-center justify-between px-[clamp(1.25rem,4vw,4rem)] py-7">
        <span className="font-display text-base font-medium tracking-tight text-white">
          olune
        </span>
        <div className="flex items-center gap-6">
          <a
            href="/login"
            className="text-xs uppercase tracking-widest text-muted transition-colors hover:text-chalk"
          >
            Sign in
          </a>
          <a
            href="/onboarding"
            className="rounded-full border border-white/15 px-5 py-2 text-xs font-bold uppercase tracking-wide text-chalk transition-colors hover:border-chalk"
          >
            Get started
          </a>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 mx-auto max-w-[1320px] px-[clamp(1.25rem,4vw,4rem)] pb-24 pt-[clamp(4rem,10vw,7rem)]"
      >
        {/* Eyebrow */}
        <motion.div
          variants={rise}
          className="mb-[clamp(1.4rem,3vw,2rem)] inline-flex items-center gap-4 text-[clamp(.62rem,1.4vw,.72rem)] uppercase tracking-[0.36em] text-muted"
        >
          <span className="h-px w-[clamp(28px,6vw,56px)] bg-iris" />
          The dance studio platform
        </motion.div>

        {/* Headline */}
        <h1 className="font-display text-[clamp(3rem,11vw,10.5rem)] font-light uppercase leading-[0.92] tracking-[-0.015em] text-white">
          <motion.span variants={rise} className="block">
            Your brand.
          </motion.span>
          <motion.span variants={rise} className="block">
            Your{" "}
            <span className="font-serif text-[1.06em] font-light normal-case italic text-lumen [text-shadow:0_0_60px_rgba(107,102,201,.55)]">
              studio.
            </span>
          </motion.span>
        </h1>

        {/* Sub-head */}
        <motion.p
          variants={rise}
          className="mt-[clamp(1.4rem,3vw,2.2rem)] max-w-[46ch] text-[clamp(1rem,1.7vw,1.2rem)] leading-relaxed text-chalk/80"
        >
          Olune is a white-label management platform for dance studios — scheduling,
          roll call, parent portals and invoicing, dressed entirely in your colours.
        </motion.p>

        {/* CTAs */}
        <motion.div
          variants={rise}
          className="mt-[clamp(2rem,4vw,2.8rem)] flex flex-wrap gap-4"
        >
          <motion.a
            href="/onboarding"
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
            className="group inline-flex items-center gap-3 rounded-full bg-iris px-8 py-[1.05rem] text-sm font-semibold uppercase tracking-wide text-white shadow-[0_10px_40px_-12px_rgba(107,102,201,.65)] transition-colors hover:bg-lumen hover:text-midnight"
          >
            Start your studio
            <span className="transition-transform duration-300 group-hover:translate-x-1.5">→</span>
          </motion.a>

          <motion.a
            href="/login"
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
            className="inline-flex items-center rounded-full border border-white/15 px-8 py-[1.05rem] text-sm font-bold uppercase tracking-wide text-chalk transition-colors hover:border-chalk"
          >
            Sign in to your studio
          </motion.a>
        </motion.div>
      </motion.div>

      {/* ── FEATURES ─────────────────────────────────────────────────────── */}
      <div className="relative z-10 mx-auto max-w-[1320px] px-[clamp(1.25rem,4vw,4rem)] pb-32">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-10 inline-flex items-center gap-4 text-[0.68rem] uppercase tracking-[0.3em] text-muted"
        >
          <span className="h-px w-8 bg-iris" />
          Everything a studio needs
        </motion.div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6 backdrop-blur-sm"
            >
              <span className="mb-4 block text-xl text-iris">{f.icon}</span>
              <p className="mb-2 text-sm font-bold uppercase tracking-wide text-chalk">
                {f.label}
              </p>
              <p className="text-sm leading-relaxed text-muted">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── DISCIPLINE MARQUEE (same as studio hero — keeps brand language) ── */}
      <div className="absolute inset-x-0 bottom-0 z-10 overflow-hidden border-t border-white/10 py-[1.1rem] [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
        <motion.div
          className="flex w-max gap-12"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 34, ease: "linear", repeat: Infinity }}
        >
          {[
            "Multi-tenant", "White-label", "Roll Call", "Invoicing",
            "Portals", "Scheduling", "Branding", "Analytics",
            "Multi-tenant", "White-label", "Roll Call", "Invoicing",
            "Portals", "Scheduling", "Branding", "Analytics",
          ].map((d, i) => (
            <span
              key={i}
              className="flex items-center gap-12 whitespace-nowrap text-sm uppercase tracking-[0.28em] text-muted after:text-xs after:text-iris after:content-['✦']"
            >
              {d}
            </span>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
