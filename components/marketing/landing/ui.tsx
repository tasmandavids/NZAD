"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { OluneLogo } from "@/components/brand/OluneLogo";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";

const DISPLAY_FONT = "font-[family-name:var(--font-landing-display)]";

export function Eyebrow({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <div
      className={`mb-4 inline-flex items-center gap-2.5 text-[13px] font-bold uppercase tracking-[0.14em] ${
        dark ? "text-white/60" : "text-landing-navy/46"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-landing-accent" />
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
      whileHover={{ y: -3, scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
      className={`inline-flex items-center gap-2.5 rounded-full bg-landing-navy px-9 py-[1.05rem] text-[16.5px] font-bold text-white shadow-[0_18px_40px_-18px_rgba(26,21,53,0.7)] transition-shadow hover:shadow-[0_28px_56px_-18px_var(--color-landing-accent)] ${className}`}
    >
      {children}
      <span aria-hidden>→</span>
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
    <a
      href={href}
      className={`inline-flex items-center gap-2 border-b border-landing-navy/30 py-1 text-[15.5px] font-semibold text-landing-navy transition-colors hover:border-landing-accent hover:text-landing-accent ${className}`}
    >
      {children}
    </a>
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
      className={`relative isolate overflow-hidden rounded-t-[48px] px-[clamp(1.25rem,4vw,3rem)] py-[clamp(4rem,9vw,7.25rem)] ${
        dark ? "bg-landing-navy text-white" : ""
      } ${className}`}
    >
      <div className="relative z-10 mx-auto w-full max-w-[1120px]">{children}</div>
    </section>
  );
}

export function LandingNav() {
  const t = useTranslations("marketing");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { href: "#features", label: t("features") },
    { href: "#pricing", label: t("pricing") },
    { href: "#about", label: t("about") },
    { href: "#compare", label: t("compare") },
  ];

  return (
    <nav
      className={`sticky top-0 z-50 flex items-center justify-between px-[clamp(1.25rem,4vw,3rem)] transition-[padding,background-color,backdrop-filter,border-color] duration-300 ${
        scrolled
          ? "border-b border-landing-navy/[0.07] bg-landing-paper/85 py-3.5 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent py-5"
      }`}
    >
      <a href="#hero" className="transition-opacity hover:opacity-80">
        <OluneLogo size="lg" />
      </a>
      <div className="hidden items-center gap-9 md:flex">
        {links.map((l) => (
          <a
            key={l.href}
            href={l.href}
            className="text-[15px] font-medium text-landing-navy/66 transition-colors hover:text-landing-accent"
          >
            {l.label}
          </a>
        ))}
      </div>
      <div className="flex items-center gap-5">
        <LanguageSwitcher compact className="hidden sm:inline-flex" />
        <Link
          href="/login"
          className="hidden text-[15px] font-medium text-landing-navy/66 transition-colors hover:text-landing-accent sm:inline"
        >
          {t("signIn")}
        </Link>
        <Link
          href="/onboarding"
          className="rounded-full bg-landing-navy px-5 py-2.5 text-[14.5px] font-bold text-white transition-transform hover:-translate-y-0.5"
        >
          {t("startFree")}
        </Link>
      </div>
    </nav>
  );
}

export function LandingFooter() {
  const t = useTranslations("marketing");

  return (
    <footer className="relative overflow-hidden rounded-t-[48px] bg-landing-navy px-[clamp(1.25rem,4vw,3rem)] pb-14 pt-24 text-white">
      <div className="mx-auto w-full max-w-[1180px]">
        <p className="mb-5 text-center text-base text-white/50">{t("tagline")}</p>
        <h2
          className={`${DISPLAY_FONT} mb-14 select-none text-center text-[clamp(80px,16vw,220px)] italic leading-none tracking-tight`}
          style={{
            background:
              "linear-gradient(90deg, rgba(255,255,255,0.12), var(--color-landing-accent), rgba(255,255,255,0.12))",
            backgroundSize: "200% auto",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          olune
        </h2>

        <div className="flex flex-wrap items-center justify-between gap-6 border-t border-white/12 pt-10">
          <LanguageSwitcher compact className="text-white/70" />
          <div className="flex flex-wrap gap-8 text-[14.5px] font-medium text-white/55">
            <a href="#features" className="transition-colors hover:text-white">{t("features")}</a>
            <a href="#pricing" className="transition-colors hover:text-white">{t("pricing")}</a>
            <Link href="/login" className="transition-colors hover:text-white">{t("signIn")}</Link>
            <Link href="/onboarding" className="transition-colors hover:text-white">{t("startFree")}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
