"use client";

import { useRef, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { OluneLogo } from "@/components/brand/OluneLogo";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { rise } from "./motion";

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="mb-[clamp(1rem,2.5vw,1.6rem)] inline-flex items-center gap-4 text-[clamp(.62rem,1.4vw,.72rem)] font-medium uppercase tracking-[0.36em] text-slate">
      <span className="h-px w-[clamp(28px,6vw,48px)] bg-iris" />
      {children}
    </div>
  );
}

export function PrimaryButton({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.a
      href={href}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
      className={`group inline-flex items-center gap-3 rounded-full bg-ink-black px-8 py-[1.05rem] text-sm font-semibold uppercase tracking-wide text-paper shadow-[0_10px_40px_-12px_rgba(0,0,0,.25)] transition-colors hover:bg-iris ${className}`}
    >
      {children}
      <span className="transition-transform duration-300 group-hover:translate-x-1.5">→</span>
    </motion.a>
  );
}

export function SecondaryButton({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.a
      href={href}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
      className={`inline-flex items-center rounded-full border border-ink-black/20 bg-paper/80 px-8 py-[1.05rem] text-sm font-bold uppercase tracking-wide text-ink-black backdrop-blur-sm transition-colors hover:border-ink-black/40 hover:bg-paper ${className}`}
    >
      {children}
    </motion.a>
  );
}

export function SectionShell({
  id,
  children,
  className = "",
  dark = false,
}: {
  id?: string;
  children: ReactNode;
  className?: string;
  dark?: boolean;
}) {
  return (
    <section
      id={id}
      className={`relative isolate overflow-hidden px-[clamp(1.25rem,4vw,4rem)] py-[clamp(4rem,10vw,7rem)] ${className}`}
    >
      {dark && (
        <>
          <div
            className="pointer-events-none absolute inset-0 -z-10 bg-midnight"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 -z-10 opacity-40"
            style={{
              background:
                "radial-gradient(50vmax 40vmax at 20% 30%, rgba(107,102,201,.35), transparent 60%), radial-gradient(45vmax 35vmax at 80% 70%, rgba(185,181,238,.15), transparent 55%)",
            }}
            aria-hidden
          />
        </>
      )}
      <div className="relative z-10 mx-auto w-full max-w-[1320px]">{children}</div>
    </section>
  );
}

export function ProductDemo({
  title,
  subtitle,
  reversed = false,
  accent = "iris",
}: {
  title: string;
  subtitle: string;
  reversed?: boolean;
  accent?: "iris" | "apricot" | "lumen";
}) {
  const t = useTranslations("marketing");
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduce = useReducedMotion();

  const accentStyles = {
    iris: "from-iris/30 to-transparent",
    apricot: "from-apricot/35 to-transparent",
    lumen: "from-lumen/40 to-transparent",
  };

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (reduce) v.pause();
    else v.play().catch(() => {});
  }, [reduce]);

  return (
    <motion.div
      variants={rise}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-16 ${reversed ? "lg:[direction:rtl]" : ""}`}
    >
      <div className={reversed ? "lg:[direction:ltr]" : ""}>
        <h3 className="font-display text-[clamp(1.75rem,4vw,2.5rem)] font-light leading-tight tracking-tight text-ink-black">
          {title}
        </h3>
        <p className="mt-4 max-w-[42ch] text-[clamp(1rem,1.5vw,1.125rem)] leading-relaxed text-slate">
          {subtitle}
        </p>
      </div>

      <div className={`${reversed ? "lg:[direction:ltr]" : ""}`}>
        <div className="overflow-hidden rounded-2xl border border-ink-black/[0.08] bg-paper shadow-[0_24px_80px_-24px_rgba(0,0,0,.18)]">
          <div className="flex items-center gap-2 border-b border-ink-black/[0.06] bg-ivory/90 px-4 py-3 backdrop-blur-sm">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
            <OluneLogo size="xs" className="ml-3 min-w-0 shrink" />
          </div>
          <div className="relative aspect-[16/10] overflow-hidden bg-midnight">
            <video
              ref={videoRef}
              autoPlay
              muted
              loop
              playsInline
              poster="/hero-poster.jpg"
              className="h-full w-full object-cover opacity-90"
            >
              <source src="/hero.webm" type="video/webm" />
              <source src="/hero.mp4" type="video/mp4" />
            </video>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-midnight/50 via-transparent to-midnight/20" />
            <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accentStyles[accent]}`} />
            <div className="pointer-events-none absolute inset-x-6 top-6 space-y-2 opacity-90">
              <div className="h-2 w-24 rounded-full bg-white/20" />
              <div className="h-2 w-40 rounded-full bg-white/15" />
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="h-14 rounded-lg border border-white/10 bg-white/10 backdrop-blur-sm" />
                <div className="h-14 rounded-lg border border-white/10 bg-white/10 backdrop-blur-sm" />
                <div className="h-14 rounded-lg border border-white/10 bg-white/10 backdrop-blur-sm" />
              </div>
            </div>
            <div className="absolute bottom-4 left-4 rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-[0.65rem] font-medium uppercase tracking-[0.18em] text-white/90 backdrop-blur-md">
              {t("livePreview")}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function LandingNav() {
  const t = useTranslations("marketing");

  const links = [
    { href: "#features", label: t("nav.features") },
    { href: "#pricing", label: t("nav.pricing") },
    { href: "#about", label: t("nav.about") },
    { href: "#compare", label: t("nav.compare") },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-ink-black/[0.06] bg-paper/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1320px] items-center justify-between px-[clamp(1.25rem,4vw,4rem)] py-5">
        <a href="#" className="transition-opacity hover:opacity-80">
          <OluneLogo size="lg" />
        </a>
        <div className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[0.68rem] font-medium uppercase tracking-[0.22em] text-slate transition-colors hover:text-ink-black"
            >
              {l.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <LanguageSwitcher compact className="hidden sm:inline-flex" />
          <Link
            href="/login"
            className="hidden text-[0.68rem] font-medium uppercase tracking-[0.22em] text-slate transition-colors hover:text-ink-black sm:inline"
          >
            {t("signIn")}
          </Link>
          <Link
            href="/onboarding"
            className="rounded-full border border-ink-black/15 bg-paper px-5 py-2 text-[0.68rem] font-bold uppercase tracking-wide text-ink-black shadow-sm transition-colors hover:border-iris/40 hover:bg-ivory"
          >
            {t("startFree")}
          </Link>
        </div>
      </div>
    </nav>
  );
}

export function LandingFooter() {
  const t = useTranslations("marketing");

  return (
    <footer className="relative border-t border-ink-black/[0.08] bg-midnight px-[clamp(1.25rem,4vw,4rem)] py-12 text-white/80">
      <div className="mx-auto flex max-w-[1320px] flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
        <div>
          <OluneLogo theme="dark" size="md" />
          <p className="mt-3 text-sm text-white/60">{t("tagline")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-6 text-[0.68rem] font-medium uppercase tracking-[0.2em] text-white/50">
          <LanguageSwitcher compact className="text-white/70" />
          <a href="#features" className="transition-colors hover:text-white">{t("nav.features")}</a>
          <a href="#pricing" className="transition-colors hover:text-white">{t("nav.pricing")}</a>
          <Link href="/login" className="transition-colors hover:text-white">{t("signIn")}</Link>
          <Link href="/onboarding" className="transition-colors hover:text-white">{t("startFree")}</Link>
        </div>
      </div>
    </footer>
  );
}
