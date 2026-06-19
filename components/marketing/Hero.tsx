"use client";

import { useRef, useEffect } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import { useTranslations } from "next-intl";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};

const rise: Variants = {
  hidden: { opacity: 0, y: 34 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] },
  },
};

const word: Variants = {
  hidden: { opacity: 0, y: "0.5em" },
  show: { opacity: 1, y: 0, transition: { duration: 0.85, ease: [0.16, 1, 0.3, 1] } },
};

const DISCIPLINE_KEYS = [
  "ballet",
  "contemporary",
  "jazz",
  "hipHop",
  "tap",
  "lyrical",
  "acro",
  "pointe",
] as const;

export default function Hero({
  studioName,
  tagline,
}: {
  studioName: string;
  tagline?: string | null;
}) {
  const t = useTranslations("marketing.studioHero");
  const ref = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduce = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const yBg = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["0%", "32%"]);
  const yText = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["0%", "14%"]);
  const fade = useTransform(scrollYProgress, [0, 0.85], [1, 0]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (reduce) v.pause();
    else v.play().catch(() => {});
  }, [reduce]);

  const disciplines = DISCIPLINE_KEYS.map((key) => t(`disciplines.${key}`));

  return (
    <header
      ref={ref}
      className="relative isolate flex min-h-[100svh] items-center overflow-hidden bg-gradient-to-b from-paper via-ivory to-paper px-[clamp(1.25rem,4vw,4rem)] pb-16 pt-32 text-ink-black"
    >
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
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-paper/70 via-ivory/50 to-paper/80" />
      </motion.div>

      <motion.div
        style={{ y: yText, opacity: fade }}
        variants={container}
        initial="hidden"
        animate="show"
        className="relative mx-auto w-full max-w-[1320px]"
      >
        <motion.div
          variants={rise}
          className="mb-[clamp(1.4rem,3vw,2.2rem)] inline-flex items-center gap-4 text-[clamp(.62rem,1.4vw,.72rem)] font-medium uppercase tracking-[0.36em] text-slate"
        >
          <span className="h-px w-[clamp(28px,6vw,56px)] bg-iris" />
          {studioName}
        </motion.div>

        <h1 className="font-display text-[clamp(3.1rem,11.5vw,11rem)] font-light uppercase leading-[0.92] tracking-[-0.015em] text-ink-black">
          <motion.span variants={word} className="inline-block">{t("headlineWhere")}</motion.span>{" "}
          <motion.span variants={word} className="inline-block">{t("headlineMovement")}</motion.span>
          <br />
          <motion.span variants={word} className="inline-block">{t("headlineBecomes")}</motion.span>{" "}
          <motion.span
            variants={word}
            className="inline-block font-serif text-[1.06em] font-light normal-case italic text-iris"
          >
            {t("headlineArt")}
          </motion.span>
        </h1>

        <motion.p
          variants={rise}
          className="mt-[clamp(1.4rem,3vw,2.2rem)] max-w-[46ch] text-[clamp(1rem,1.7vw,1.22rem)] leading-relaxed text-ink-black/75"
        >
          {tagline ?? t("defaultTagline")}
        </motion.p>

        <motion.div variants={rise} className="mt-[clamp(2rem,4vw,2.8rem)] flex flex-wrap gap-4">
          <motion.a
            href="/enrol"
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
            className="group inline-flex items-center gap-3 rounded-full bg-ink-black px-8 py-[1.05rem] text-sm font-semibold uppercase tracking-wide text-paper shadow-[0_10px_40px_-12px_rgba(0,0,0,.25)] transition-colors hover:bg-iris"
          >
            {t("bookTrial")}
            <span className="transition-transform duration-300 group-hover:translate-x-1.5">→</span>
          </motion.a>

          <motion.a
            href="/programmes"
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
            className="inline-flex items-center rounded-full border border-ink-black/20 bg-paper/80 px-8 py-[1.05rem] text-sm font-bold uppercase tracking-wide text-ink-black backdrop-blur-sm transition-colors hover:border-ink-black/40 hover:bg-paper"
          >
            {t("exploreProgrammes")}
          </motion.a>
        </motion.div>
      </motion.div>

      <div className="absolute inset-x-0 bottom-0 z-10 overflow-hidden border-t border-ink-black/10 bg-paper/60 py-[1.1rem] backdrop-blur-sm [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
        <motion.div
          className="flex w-max gap-12"
          animate={reduce ? undefined : { x: ["0%", "-50%"] }}
          transition={{ duration: 34, ease: "linear", repeat: Infinity }}
        >
          {[...disciplines, ...disciplines].map((d, i) => (
            <span
              key={i}
              className="flex items-center gap-12 whitespace-nowrap text-sm font-medium uppercase tracking-[0.28em] text-slate after:text-xs after:text-iris after:content-['✦']"
            >
              {d}
            </span>
          ))}
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="absolute bottom-[clamp(5rem,9vh,7rem)] right-[clamp(1.25rem,4vw,4rem)] z-10 hidden flex-col items-center gap-3 text-[0.6rem] uppercase tracking-[0.3em] text-slate [writing-mode:vertical-rl] sm:flex"
      >
        {t("scroll")}
        <motion.span
          animate={reduce ? undefined : { scaleY: [1, 0.4, 1], originY: 0 }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="h-12 w-px bg-gradient-to-b from-iris to-transparent"
        />
      </motion.div>
    </header>
  );
}
