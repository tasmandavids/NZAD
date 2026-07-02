"use client";

import type { ReactElement } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { container, fadeIn, rise } from "./motion";
import { Eyebrow } from "./ui";

const CELLS = [
  { key: "liveSites", span: "md:col-span-2 md:row-span-2", feature: true },
  { key: "invoicing", span: "md:col-span-2 md:row-span-1", feature: false },
  { key: "cashFlow", span: "md:col-span-1 md:row-span-1", feature: false },
  { key: "quotes", span: "md:col-span-1 md:row-span-1", feature: false },
  { key: "projects", span: "md:col-span-2 md:row-span-1", feature: false },
  { key: "expenses", span: "md:col-span-1 md:row-span-1", feature: false },
  { key: "clients", span: "md:col-span-1 md:row-span-1", feature: false },
] as const;

const STAT_KEYS = ["logins", "tools", "price"] as const;

const CELL_ICONS: Record<Exclude<(typeof CELLS)[number]["key"], "liveSites">, (props: { className?: string }) => ReactElement> = {
  invoicing: ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="5" y="3" width="14" height="18" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8.5 8h7M8.5 12h7M8.5 16h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  cashFlow: ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M5 19V13M11 19V9M17 19V5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  quotes: ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M8.5 10.5c0-1.66-1.34-3-3-3v3c0 1.1.9 2 2 2h1v-2Zm8 0c0-1.66-1.34-3-3-3v3c0 1.1.9 2 2 2h1v-2Z"
        fill="currentColor"
      />
      <path d="M5.5 14.5h2M14.5 14.5h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  projects: ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="4" y="7" width="16" height="3" rx="1.5" fill="currentColor" opacity="0.35" />
      <rect x="4" y="7" width="10" height="3" rx="1.5" fill="currentColor" />
      <rect x="4" y="14" width="16" height="3" rx="1.5" fill="currentColor" opacity="0.35" />
      <rect x="4" y="14" width="6" height="3" rx="1.5" fill="currentColor" />
    </svg>
  ),
  expenses: ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 8h6M9 12h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  clients: ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="8" cy="9" r="2.4" fill="currentColor" />
      <circle cx="16" cy="8" r="1.8" fill="currentColor" opacity="0.6" />
      <circle cx="15" cy="15" r="1.5" fill="currentColor" opacity="0.4" />
    </svg>
  ),
};

function LivePreviewCard() {
  return (
    <div className="absolute right-[-6px] top-0 w-[74%] max-w-[320px] rotate-2 overflow-hidden rounded-xl border border-white/15 bg-[#faf5fb] shadow-[0_34px_70px_-26px_rgba(0,0,0,0.75)]">
      <div className="flex items-center justify-between border-b border-[#3a2040]/10 px-3.5 py-2.5">
        <span className="font-[family-name:var(--font-landing-display)] text-[13px] text-[#3a2040]">Tempo Dance Co.</span>
        <span className="flex gap-2.5 text-[9px] font-bold text-[#3a2040]/60">
          <span>Classes</span>
          <span>Timetable</span>
          <span>Visit</span>
        </span>
      </div>
      <div className="bg-[linear-gradient(135deg,#2a1a33_0%,#46284d_100%)] px-3.5 py-3.5 pb-3">
        <div className="font-[family-name:var(--font-landing-display)] text-base italic leading-tight text-[#f3e4f6]">Term 3 enrolments open.</div>
        <span className="mt-2 inline-block rounded-full bg-[#d4547e] px-2.5 py-1 text-[9px] font-bold text-white">Book a trial class</span>
      </div>
      <div className="grid grid-cols-3 gap-2 px-3.5 py-2.5 pb-3">
        {["Ballet", "Hip hop", "Contemporary"].map((label) => (
          <div key={label}>
            <div className="h-[26px] rounded-md bg-[repeating-linear-gradient(45deg,#ecd9ef_0_5px,#f3e7f5_5px_10px)]" />
            <div className="mt-1 text-[8.5px] font-bold text-[#3a2040]">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BentoGrid() {
  const t = useTranslations("marketing");

  return (
    <>
      <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }} className="mb-14 text-center">
        <Eyebrow>{t("bento.eyebrow")}</Eyebrow>
        <motion.h2 variants={rise} className="font-[family-name:var(--font-landing-display)] mt-2 text-[clamp(38px,5.2vw,78px)] font-medium leading-[1.05] tracking-[-0.02em] text-landing-navy">
          {t("bento.title")}
        </motion.h2>
      </motion.div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-4">
        {CELLS.map((cell, i) => (
          <motion.div key={cell.key} variants={fadeIn} custom={i} className={cell.span}>
            <div
              className={
                cell.feature
                  ? "relative flex h-full flex-col justify-between overflow-hidden rounded-[18px] bg-[linear-gradient(160deg,#2a2154_0%,#1a1535_60%,#3a2f7a_100%)] p-8 shadow-[0_30px_70px_-40px_var(--color-landing-accent)] transition-transform duration-500 hover:-translate-y-2"
                  : "relative flex h-full flex-col justify-between overflow-hidden rounded-[18px] border border-landing-navy/[0.08] bg-white p-6 shadow-[0_20px_44px_-34px_rgba(26,21,53,0.4)] transition-transform duration-500 hover:-translate-y-2"
              }
            >
              <div className="relative min-h-[90px] flex-1">
                {cell.feature ? (
                  <>
                    <span className="inline-block h-4 w-4 rounded-full bg-landing-accent shadow-[0_0_16px_var(--color-landing-accent)]" />
                    <LivePreviewCard />
                  </>
                ) : (
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] bg-landing-accent/10 text-landing-accent">
                    {CELL_ICONS[cell.key]({ className: "h-5 w-5" })}
                  </span>
                )}
              </div>
              <div>
                <h3 className={`font-[family-name:var(--font-landing-display)] mb-1.5 mt-3 leading-[1.15] ${cell.feature ? "text-[26px] text-white" : "text-[20px] text-landing-navy"}`}>
                  {t(`bento.cells.${cell.key}.title`)}
                </h3>
                <p className={`max-w-[320px] leading-relaxed ${cell.feature ? "text-[15px] text-white/72" : "text-sm text-landing-navy/56"}`}>
                  {t(`bento.cells.${cell.key}.body`)}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div variants={rise} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }} className="mx-auto mt-16 max-w-[940px] overflow-hidden rounded-[24px] bg-[linear-gradient(150deg,#241b4e_0%,#1a1535_55%,#2c2260_100%)] px-6 py-11 shadow-[0_50px_110px_-60px_var(--color-landing-accent)] sm:px-10">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {STAT_KEYS.map((key, i) => (
            <div key={key} className={`px-6 py-2.5 text-center ${i > 0 ? "sm:border-l sm:border-white/12" : ""}`}>
              <div className="font-[family-name:var(--font-landing-display)] text-[clamp(44px,4.6vw,68px)] leading-none text-white">{t(`bento.stats.${key}.n`)}</div>
              <div className="mx-auto my-3.5 h-0.5 w-16 rounded bg-[linear-gradient(90deg,transparent,var(--color-landing-accent),transparent)]" />
              <div className="text-[15px] text-white/60">{t(`bento.stats.${key}.label`)}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </>
  );
}
