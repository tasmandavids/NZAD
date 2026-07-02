"use client";

import { useRef } from "react";
import dynamic from "next/dynamic";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { OluneLogo } from "@/components/brand/OluneLogo";
import { container, rise } from "./motion";
import { PrimaryButton, SecondaryButton } from "./ui";

const ParticleBackground = dynamic(
  () => import("@/components/landing/ParticleBackground").then((m) => m.ParticleBackground),
  { ssr: false },
);

const MARQUEE_KEYS = [
  "projects",
  "invoicing",
  "liveSites",
  "cashFlow",
  "clients",
  "tasks",
  "quotes",
  "expenses",
] as const;

export function LandingHero() {
  const t = useTranslations("marketing");
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const yBg = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["0%", "28%"]);
  const yText = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["0%", "12%"]);
  const fade = useTransform(scrollYProgress, [0, 0.85], [1, 0]);

  const marqueeItems = MARQUEE_KEYS.map((key) => t(`hero.marquee.${key}`));

  return (
    <header
      id="hero"
      ref={ref}
      className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-gradient-to-b from-landing-ivory to-landing-paper text-landing-navy"
    >
      <ParticleBackground variant="light" />

      <motion.div style={{ y: yBg }} className="pointer-events-none absolute inset-0 -z-[5]">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(42vmax 42vmax at 50% 30%, rgba(139,124,240,.18), rgba(139,124,240,.05) 42%, transparent 68%)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-landing-ivory/70 via-landing-paper/50 to-landing-paper/85" />
      </motion.div>

      <motion.div
        style={{ y: yText, opacity: fade }}
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 mx-auto flex w-full max-w-[1120px] flex-1 flex-col items-center justify-center px-[clamp(1.25rem,4vw,3rem)] pb-24 pt-[clamp(6rem,10vw,7.5rem)] text-center"
      >
        <motion.div variants={rise} className="mb-9 motion-safe:animate-[bobY_7s_ease-in-out_infinite]">
          <OluneLogo variant="mark" size="hero" />
        </motion.div>

        <h1 className="font-[family-name:var(--font-landing-display)] text-[clamp(46px,7.4vw,118px)] font-medium leading-[1.02] tracking-[-0.02em] text-landing-navy">
          <motion.span variants={container} initial="hidden" animate="show" className="block">
            {t("hero.titleLine1").split(" ").map((word, i) => (
              <motion.span key={i} variants={rise} custom={i} className="inline-block">{word}&nbsp;</motion.span>
            ))}
          </motion.span>
          <motion.span variants={container} initial="hidden" animate="show" className="block italic text-landing-accent">
            {t("hero.titleLine2").split(" ").map((word, i) => (
              <motion.span key={i} variants={rise} custom={i} className="inline-block">{word}&nbsp;</motion.span>
            ))}
          </motion.span>
        </h1>

        <motion.p
          variants={rise}
          className="mx-auto mt-8 max-w-[40ch] text-xl leading-relaxed text-landing-navy/62"
        >
          {t("hero.subtitle")}
        </motion.p>

        <motion.div variants={rise} className="mt-11 flex flex-wrap items-center justify-center gap-9">
          <PrimaryButton href="/onboarding">{t("startFree")}</PrimaryButton>
          <SecondaryButton href="#features">{t("hero.seeInAction")}</SecondaryButton>
        </motion.div>

        <motion.p
          variants={rise}
          className="mx-auto mt-11 max-w-[620px] font-[family-name:var(--font-landing-display)] text-[clamp(17px,1.6vw,21px)] italic leading-snug text-landing-navy/40"
        >
          &ldquo;{t("hero.quote")}&rdquo;
        </motion.p>
      </motion.div>

      <div className="relative z-10 overflow-hidden border-t border-landing-navy/10 py-[1.9rem] [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
        <motion.div
          className="flex w-max gap-14"
          animate={reduce ? undefined : { x: ["0%", "-50%"] }}
          transition={{ duration: 32, ease: "linear", repeat: Infinity }}
        >
          {[...marqueeItems, ...marqueeItems].map((item, i) => (
            <span
              key={i}
              className="flex items-center gap-7 whitespace-nowrap font-[family-name:var(--font-landing-display)] text-[22px] italic text-landing-navy/34"
            >
              {item}
              <span className="text-[13px] text-landing-accent">✦</span>
            </span>
          ))}
        </motion.div>
      </div>
    </header>
  );
}
