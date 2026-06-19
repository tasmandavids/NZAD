"use client";

import { useRef, useEffect } from "react";
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduce = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const yBg = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["0%", "28%"]);
  const yText = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["0%", "12%"]);
  const fade = useTransform(scrollYProgress, [0, 0.85], [1, 0]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (reduce) v.pause();
    else v.play().catch(() => {});
  }, [reduce]);

  const marqueeItems = MARQUEE_KEYS.map((key) => t(`hero.marquee.${key}`));

  return (
    <header
      ref={ref}
      className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-gradient-to-b from-paper via-ivory to-paper text-ink-black"
    >
      <ParticleBackground variant="light" />

      <motion.div style={{ y: yBg }} className="pointer-events-none absolute inset-0 -z-[5]">
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          poster="/hero-poster.jpg"
          className="h-full w-full object-cover opacity-[0.18]"
        >
          <source src="/hero.webm" type="video/webm" />
          <source src="/hero.mp4" type="video/mp4" />
        </video>
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(42vmax 42vmax at 50% 38%, rgba(107,102,201,.14), rgba(107,102,201,.04) 40%, transparent 68%)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-paper/75 via-ivory/55 to-paper/85" />
      </motion.div>

      <motion.div
        style={{ y: yText, opacity: fade }}
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 mx-auto flex w-full max-w-[1320px] flex-1 flex-col justify-center px-[clamp(1.25rem,4vw,4rem)] pb-28 pt-[clamp(3rem,8vw,5rem)]"
      >
        <motion.div variants={rise} className="mb-[clamp(1.25rem,3.5vw,2.25rem)]">
          <OluneLogo variant="stacked" size="hero" animated className="items-start" />
        </motion.div>

        <h1 className="font-display text-[clamp(2.6rem,9.5vw,7.5rem)] font-light leading-[0.95] tracking-[-0.02em] text-ink-black">
          <motion.span variants={rise} className="block">
            {t("hero.titleLine1")}
          </motion.span>
          <motion.span variants={rise} className="block">
            <span className="font-serif text-[1.05em] font-light italic text-iris">
              {t("hero.titleLine2")}
            </span>
          </motion.span>
        </h1>

        <motion.p
          variants={rise}
          className="mt-[clamp(1.4rem,3vw,2rem)] max-w-[48ch] text-[clamp(1.05rem,1.8vw,1.25rem)] leading-relaxed text-ink-black/75"
        >
          {t("hero.subtitle")}
        </motion.p>

        <motion.div variants={rise} className="mt-[clamp(2rem,4vw,2.6rem)] flex flex-wrap gap-4">
          <PrimaryButton href="/onboarding">{t("startFree")}</PrimaryButton>
          <SecondaryButton href="#features">{t("hero.seeInAction")}</SecondaryButton>
        </motion.div>

        <motion.blockquote
          variants={rise}
          className="mt-[clamp(2.5rem,5vw,3.5rem)] max-w-[52ch] border-l-2 border-iris/40 pl-5 text-[clamp(.95rem,1.4vw,1.05rem)] italic leading-relaxed text-slate"
        >
          {t("hero.quote")}
        </motion.blockquote>
      </motion.div>

      <div className="relative z-10 overflow-hidden border-t border-ink-black/10 bg-paper/60 py-[1.1rem] backdrop-blur-sm [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
        <motion.div
          className="flex w-max gap-12"
          animate={reduce ? undefined : { x: ["0%", "-50%"] }}
          transition={{ duration: 32, ease: "linear", repeat: Infinity }}
        >
          {[...marqueeItems, ...marqueeItems].map((item, i) => (
            <span
              key={i}
              className="flex items-center gap-12 whitespace-nowrap text-sm font-medium uppercase tracking-[0.28em] text-slate after:text-xs after:text-iris after:content-['✦']"
            >
              {item}
            </span>
          ))}
        </motion.div>
      </div>
    </header>
  );
}
