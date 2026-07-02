"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { OluneLogo } from "@/components/brand/OluneLogo";
import { rise } from "./motion";

const ROW_KEYS = ["projects", "invoicing", "websites", "sync", "cost", "tools", "purpose"] as const;
const HIGHLIGHT_KEYS = ["faster", "cheaper", "better"] as const;

export function CompareTable() {
  const t = useTranslations("marketing.compareSection");

  return (
    <>
      <motion.div
        variants={rise}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
        className="mx-auto overflow-hidden rounded-xl bg-white shadow-[0_40px_90px_-50px_rgba(26,21,53,0.45)]"
      >
        <div className="grid grid-cols-[1.3fr_1fr_1fr] border-b-2 border-landing-navy px-7 pb-5 pt-6">
          <div />
          <div className="text-[13px] font-semibold uppercase tracking-[0.06em] text-landing-navy/40">
            {t("stackHeader")}
          </div>
          <div className="font-[family-name:var(--font-landing-display)] text-lg italic text-landing-accent">
            <OluneLogo size="xs" className="inline-flex" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ROW_KEYS.map((key, i) => (
            <div
              key={key}
              className={`grid grid-cols-1 gap-1 px-6 py-5 sm:grid-cols-[1.3fr_1fr_1fr] sm:gap-4 ${
                i === ROW_KEYS.length - 1 ? "" : "border-b border-landing-navy/[0.09]"
              }`}
            >
              <div className="text-[15px] font-semibold text-landing-navy">{t(`rows.${key}.label`)}</div>
              <div className="text-[14px] text-landing-navy/46">{t(`rows.${key}.stack`)}</div>
              <div className="flex items-center gap-2.5 text-[14px] font-semibold text-landing-navy">
                <span className="text-base text-landing-accent">✓</span>
                {t(`rows.${key}.olune`)}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div
        variants={rise}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
        className="mx-auto mt-16 grid max-w-[940px] grid-cols-1 gap-10 text-center sm:grid-cols-3"
      >
        {HIGHLIGHT_KEYS.map((key) => (
          <div key={key}>
            <div className="font-[family-name:var(--font-landing-display)] mb-2.5 text-[27px] italic text-landing-accent">
              {t(`highlights.${key}.k`)}
            </div>
            <p className="text-[15px] leading-relaxed text-landing-navy/54">{t(`highlights.${key}.v`)}</p>
          </div>
        ))}
      </motion.div>
    </>
  );
}
