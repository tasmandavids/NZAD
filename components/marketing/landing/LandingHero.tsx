"use client";

import { useRef, useEffect, useState } from "react";
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

function IntroOverlay() {
  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center bg-landing-navy"
      initial={{ opacity: 1 }}
      animate={{ opacity: 0, transition: { delay: 0.6, duration: 0.7 } }}
    >
      <motion.div
        className="relative flex h-[72px] w-[72px] items-center justify-center"
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{
          scale: [0.4, 1.6, 3.2],
          opacity: [0, 1, 0],
        }}
        transition={{
          duration: 0.9,
          ease: [0.16, 1, 0.3, 1],
          times: [0, 0.55, 1],
        }}
      >
        <span className="absolute inset-0 rounded-full bg-landing-accent/80" />
      </motion.div>
    </motion.div>
  );
}

function ProgressEclipse() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  const width = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[55] h-[3px] bg-landing-navy/5"
    >
      <motion.div
        className="h-full bg-gradient-to-r from-landing-accent via-landing-accent/80 to-landing-accent/40"
        style={{ scaleX: width, transformOrigin: "left" }}
      />
    </div>
  );
}

export function LandingHero() {
  const t = useTranslations("marketing");
  const ref = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const yBg = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["0%", "28%"]);
  const yText = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["0%", "12%"]);
  const fade = useTransform(scrollYProgress, [0, 0.85], [1, 0]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (reduce) v.pause();
    else v.play().catch(() => {});
  }, [reduce]);

  const marqueeItems = MARQUEE_KEYS.map((key) => t(`hero.marquee.${key}`));

  return (
    <>
      {mounted && <IntroOverlay />}
      <ProgressEclipse />

      <header
        id="hero"
        ref={ref}
        className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-gradient-to-b from-landing-ivory to-landing-paper text-landing-navy"
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
            className="h-full w-full object-cover opacity-[0.16]"
          >
            <source src="/hero.webm" type="video/webm" />
            <source src="/hero.mp4" type="video/mp4" />
          </video>
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
    </>
  );
}
