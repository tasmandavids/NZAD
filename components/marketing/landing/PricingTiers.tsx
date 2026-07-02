"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useTranslations } from "next-intl";
import { fadeIn } from "./motion";

const PLAN_KEYS = ["solo", "studio", "scale"] as const;
const PRICE_TARGETS: Record<(typeof PLAN_KEYS)[number], number> = {
  solo: 19,
  studio: 49,
  scale: 99,
};

/** Counts a price up from $0 once the panel scrolls into view. */
function useCountUp(target: number, active: boolean) {
  const [value, setValue] = useState(active ? target : 0);
  const started = useRef(false);

  useEffect(() => {
    if (!active || started.current) return;
    started.current = true;
    const duration = 1200;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target]);

  return value;
}

function PriceTag({ plan }: { plan: (typeof PLAN_KEYS)[number] }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const value = useCountUp(PRICE_TARGETS[plan], inView);
  return <span ref={ref}>${value}</span>;
}

export function PricingTiers() {
  const t = useTranslations("marketing");

  return (
    <div className="mt-12 grid gap-8 lg:grid-cols-3">
      {PLAN_KEYS.map((key, i) => {
        const popular = key === "studio";
        return (
          <motion.div
            key={key}
            variants={fadeIn}
            custom={i}
            className={
              popular
                ? "relative flex -translate-y-4 flex-col rounded-xl bg-[linear-gradient(165deg,#2a2154_0%,#1a1535_55%,#4a3aa0_100%)] p-10 text-white shadow-[0_40px_90px_-34px_var(--color-landing-accent)] transition-transform hover:-translate-y-7"
                : "relative flex flex-col rounded-xl border border-landing-navy/[0.09] bg-white p-10 transition-transform hover:-translate-y-3"
            }
          >
            {popular && (
              <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-landing-accent px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-landing-navy shadow-[0_8px_24px_-6px_var(--color-landing-accent)]">
                {t("pricingSection.mostPopular")}
              </span>
            )}
            <p
              className={`text-[13px] font-bold uppercase tracking-[0.1em] ${
                popular ? "text-landing-accent" : "text-landing-navy/38"
              }`}
            >
              {t(`pricingSection.plans.${key}.tag`)}
            </p>
            <h3
              className={`font-[family-name:var(--font-landing-display)] mt-5 text-[30px] font-medium ${
                popular ? "text-white" : "text-landing-navy"
              }`}
            >
              {t(`pricingSection.plans.${key}.name`)}
            </h3>
            <p className="mt-5 flex items-baseline gap-1.5">
              <span
                className={`font-[family-name:var(--font-landing-display)] text-[56px] ${
                  popular ? "text-white" : "text-landing-navy"
                }`}
              >
                <PriceTag plan={key} />
              </span>
              <span className={popular ? "text-base text-white/65" : "text-base text-landing-navy/44"}>
                {t("pricingSection.perMonth")}
              </span>
            </p>
            <p
              className={`mt-5 flex-1 text-[15.5px] leading-relaxed ${
                popular ? "text-white/80" : "text-landing-navy/56"
              }`}
            >
              {t(`pricingSection.plans.${key}.desc`)}
            </p>
            <Link
              href="/onboarding"
              className={
                popular
                  ? "mt-8 inline-flex justify-center rounded-full bg-white py-4 text-[15.5px] font-bold text-landing-navy"
                  : "mt-8 inline-flex justify-center rounded-full border border-landing-navy/25 py-4 text-[15.5px] font-bold text-landing-navy transition-colors hover:border-landing-accent"
              }
            >
              {t("startFree")}
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
