/**
 * ============================================================================
 *  components/marketing/Hero.tsx
 *  New Zealand Academy of Dance — Landing Page Hero (PRODUCTION)
 *  Next.js 15 (App Router) · React Server/Client · Framer Motion · Tailwind v4
 * ============================================================================
 *
 *  SETUP (one-time)
 *  ----------------
 *  1.  Install deps:
 *        npm i framer-motion lenis
 *      (Framer Motion is now published as `motion` — `import { motion } from "motion/react"`.
 *       The legacy `framer-motion` package re-exports the same API and is used below.)
 *
 *  2.  Fonts — app/layout.tsx (next/font, self-hosted, zero layout shift):
 *        import { Archivo } from "next/font/google";
 *        import { Cormorant_Garamond } from "next/font/google";
 *        const archivo = Archivo({ subsets:["latin"], variable:"--font-display",
 *                                  weight:["400","500","600","700","800","900"] });
 *        const cormorant = Cormorant_Garamond({ subsets:["latin"], variable:"--font-serif",
 *                                  style:"italic", weight:["500","600"] });
 *        <html className={`${archivo.variable} ${cormorant.variable}`}> …
 *
 *  3.  Design tokens — app/globals.css (Tailwind v4 @theme):
 *        @import "tailwindcss";
 *        @theme {
 *          --color-void:    #0A0A0B;
 *          --color-ink:     #131316;
 *          --color-chalk:   #F4F2EE;
 *          --color-crimson: #C8102E;
 *          --color-oxblood: #6E0B1A;
 *          --color-ember:   #FF2D3C;
 *          --color-muted:   #8B8B92;
 *          --font-display:  var(--font-display), "Helvetica Neue", Arial, sans-serif;
 *          --font-serif:    var(--font-serif), Georgia, serif;
 *        }
 *      (Tailwind v3 alternative: add the same hex/font values under theme.extend in
 *       tailwind.config.ts — the className usage below is identical either way.)
 *
 *  4.  Video assets in /public:  hero.webm, hero.mp4, hero-poster.jpg
 *      Encode short (8–12s), silent, ~1080p, heavily compressed (<3 MB) loops.
 *
 *  USAGE — app/(marketing)/page.tsx:
 *        import Hero from "@/components/marketing/Hero";
 *        export default function Home() { return <Hero />; }
 * ============================================================================
 */

"use client";

import { useRef, useEffect } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  type Variants,
} from "framer-motion";

/* ----------------------------------------------------------------------------
 *  Animation variants — one orchestrated entrance beats scattered effects.
 *  The container staggers its children; each child rises + fades in.
 * -------------------------------------------------------------------------- */
const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};

const rise: Variants = {
  hidden: { opacity: 0, y: 34 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] }, // expressive ease-out
  },
};

/* Per-word headline reveal (small y, tighter stagger for a typeset feel). */
const word: Variants = {
  hidden: { opacity: 0, y: "0.5em" },
  show: { opacity: 1, y: 0, transition: { duration: 0.85, ease: [0.16, 1, 0.3, 1] } },
};

const DISCIPLINES = [
  "Ballet", "Contemporary", "Jazz", "Hip-Hop", "Tap", "Lyrical", "Acro", "Pointe",
];

export default function Hero({
  studioName,
  tagline,
}: {
  studioName: string;
  tagline?: string | null;
}) {
  const ref = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduce = useReducedMotion();

  /* Scroll-linked parallax: background drifts faster than the content,
     creating depth as the user scrolls the hero out of view. */
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  // When reduced motion is requested, collapse the ranges to no movement.
  const yBg = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["0%", "32%"]);
  const yText = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["0%", "14%"]);
  const fade = useTransform(scrollYProgress, [0, 0.85], [1, 0]);

  /* Pause the cinematic loop for users who prefer reduced motion (and to be
     a good citizen of battery + data on mobile). */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (reduce) v.pause();
    else v.play().catch(() => {/* autoplay may be blocked; poster covers it */});
  }, [reduce]);

  return (
    <header
      ref={ref}
      className="relative isolate flex min-h-[100svh] items-center overflow-hidden bg-gradient-to-b from-paper via-ivory to-paper px-[clamp(1.25rem,4vw,4rem)] pb-16 pt-32 text-ink-black"
    >
      {/* ===================== CINEMATIC BACKGROUND ===================== */}
      <motion.div style={{ y: yBg }} className="absolute inset-0 -z-10">
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          poster="/hero-poster.jpg"
          className="h-full w-full object-cover opacity-25"
        >
          <source src="/hero.webm" type="video/webm" />
          <source src="/hero.mp4" type="video/mp4" />
        </video>

        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(38vmax 38vmax at 50% 42%, rgba(107,102,201,.12), rgba(107,102,201,.06) 32%, transparent 64%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-paper/70 via-ivory/50 to-paper/80"
        />
      </motion.div>

      {/* ===================== HERO CONTENT ===================== */}
      <motion.div
        style={{ y: yText, opacity: fade }}
        variants={container}
        initial="hidden"
        animate="show"
        className="relative mx-auto w-full max-w-[1320px]"
      >
        {/* Eyebrow */}
        <motion.div
          variants={rise}
          className="mb-[clamp(1.4rem,3vw,2.2rem)] inline-flex items-center gap-4 text-[clamp(.62rem,1.4vw,.72rem)] font-medium uppercase tracking-[0.36em] text-slate"
        >
          <span className="h-px w-[clamp(28px,6vw,56px)] bg-iris" />
          {studioName}
        </motion.div>

        {/* Headline */}
        <h1 className="font-display text-[clamp(3.1rem,11.5vw,11rem)] font-light uppercase leading-[0.92] tracking-[-0.015em] text-ink-black">
          <motion.span variants={word} className="inline-block">Where</motion.span>{" "}
          <motion.span variants={word} className="inline-block">movement</motion.span>
          <br />
          <motion.span variants={word} className="inline-block">becomes</motion.span>{" "}
          <motion.span
            variants={word}
            className="inline-block font-serif text-[1.06em] font-light normal-case italic text-iris"
          >
            art.
          </motion.span>
        </h1>

        {/* Sub-head */}
        <motion.p
          variants={rise}
          className="mt-[clamp(1.4rem,3vw,2.2rem)] max-w-[46ch] text-[clamp(1rem,1.7vw,1.22rem)] leading-relaxed text-ink-black/75"
        >
          {tagline ?? "From a first plié to the stage — every class, every dancer, every family, all in one place."}
        </motion.p>

        {/* CTAs */}
        <motion.div variants={rise} className="mt-[clamp(2rem,4vw,2.8rem)] flex flex-wrap gap-4">
          <motion.a
            href="/enrol"
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
            className="group inline-flex items-center gap-3 rounded-full bg-ink-black px-8 py-[1.05rem] text-sm font-semibold uppercase tracking-wide text-paper shadow-[0_10px_40px_-12px_rgba(0,0,0,.25)] transition-colors hover:bg-iris"
          >
            Book a free trial
            <span className="transition-transform duration-300 group-hover:translate-x-1.5">→</span>
          </motion.a>

          <motion.a
            href="/programmes"
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
            className="inline-flex items-center rounded-full border border-ink-black/20 bg-paper/80 px-8 py-[1.05rem] text-sm font-bold uppercase tracking-wide text-ink-black backdrop-blur-sm transition-colors hover:border-ink-black/40 hover:bg-paper"
          >
            Explore programmes
          </motion.a>
        </motion.div>
      </motion.div>

      {/* ===================== DISCIPLINE MARQUEE ===================== */}
      <div className="absolute inset-x-0 bottom-0 z-10 overflow-hidden border-t border-ink-black/10 bg-paper/60 py-[1.1rem] backdrop-blur-sm [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
        <motion.div
          className="flex w-max gap-12"
          animate={reduce ? undefined : { x: ["0%", "-50%"] }}
          transition={{ duration: 34, ease: "linear", repeat: Infinity }}
        >
          {[...DISCIPLINES, ...DISCIPLINES].map((d, i) => (
            <span
              key={i}
              className="flex items-center gap-12 whitespace-nowrap text-sm font-medium uppercase tracking-[0.28em] text-slate after:text-xs after:text-iris after:content-['✦']"
            >
              {d}
            </span>
          ))}
        </motion.div>
      </div>

      {/* ===================== SCROLL CUE ===================== */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="absolute bottom-[clamp(5rem,9vh,7rem)] right-[clamp(1.25rem,4vw,4rem)] z-10 hidden flex-col items-center gap-3 text-[0.6rem] uppercase tracking-[0.3em] text-slate [writing-mode:vertical-rl] sm:flex"
      >
        Scroll
        <motion.span
          animate={reduce ? undefined : { scaleY: [1, 0.4, 1], originY: 0 }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="h-12 w-px bg-gradient-to-b from-iris to-transparent"
        />
      </motion.div>
    </header>
  );
}
