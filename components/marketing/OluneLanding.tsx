"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { OluneLogo } from "@/components/brand/OluneLogo";
import { LandingHero } from "./landing/LandingHero";
import { LandingNav, LandingFooter, SectionShell, Eyebrow, ProductDemo, PrimaryButton, SecondaryButton } from "./landing/ui";
import { container, rise, fadeIn } from "./landing/motion";

const WHY_CHOOSE_KEYS = ["faster", "value", "craft"] as const;
const EVERYDAY_KEYS = ["mornings", "money", "clients", "evenings"] as const;
const PRICING_KEYS = ["solo", "studio", "scale"] as const;
const COMPARE_ROW_KEYS = ["projects", "invoicing", "websites", "sync", "cost", "tools", "purpose"] as const;
const COMPARE_HIGHLIGHT_KEYS = ["faster", "cheaper", "better"] as const;

export default function OluneLanding() {
  const t = useTranslations("marketing");

  return (
    <div className="relative min-h-screen scroll-smooth bg-paper text-ink-black">
      <div className="w-full bg-iris px-4 py-2.5 text-center text-sm font-medium text-white">
        Olune is currently under development — general release is due in early July.{" "}
        <span className="font-semibold">All plans are free to try as much as you like until then.</span>
      </div>
      <LandingNav />
      <LandingHero />

      <SectionShell className="bg-gradient-to-b from-ivory via-paper to-ivory">
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
        >
          <Eyebrow>{t("problem.eyebrow")}</Eyebrow>
          <motion.h2
            variants={rise}
            className="max-w-[18ch] font-display text-[clamp(2rem,5vw,3.5rem)] font-light leading-tight tracking-tight"
          >
            {t("problem.title")}
          </motion.h2>
          <motion.p variants={rise} className="mt-6 max-w-[58ch] text-lg leading-relaxed text-slate">
            {t("problem.body1")}
          </motion.p>
          <motion.p variants={rise} className="mt-4 max-w-[58ch] text-lg leading-relaxed text-ink-black/80">
            {t("problem.body2")}
          </motion.p>
        </motion.div>
      </SectionShell>

      <SectionShell id="features" className="bg-paper">
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="mb-[clamp(3rem,8vw,5rem)]"
        >
          <Eyebrow>{t("featuresSection.eyebrow")}</Eyebrow>
          <motion.h2 variants={rise} className="font-display text-[clamp(2rem,5vw,3.5rem)] font-light tracking-tight">
            {t("featuresSection.title")}{" "}
            <span className="font-serif italic text-iris">{t("featuresSection.titleEmphasis")}</span>
          </motion.h2>
        </motion.div>

        <div className="space-y-[clamp(4rem,10vw,7rem)]">
          <ProductDemo
            title={t("featuresSection.manageStudio.title")}
            subtitle={t("featuresSection.manageStudio.subtitle")}
            accent="iris"
          />
          <ProductDemo
            title={t("featuresSection.money.title")}
            subtitle={t("featuresSection.money.subtitle")}
            reversed
            accent="apricot"
          />
          <ProductDemo
            title={t("featuresSection.liveSites.title")}
            subtitle={t("featuresSection.liveSites.subtitle")}
            accent="lumen"
          />
        </div>
      </SectionShell>

      <SectionShell dark className="text-white">
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="relative z-10"
        >
          <div className="mb-[clamp(2.5rem,6vw,4rem)]">
            <div className="mb-[clamp(1rem,2.5vw,1.6rem)] inline-flex items-center gap-4 text-[clamp(.62rem,1.4vw,.72rem)] font-medium uppercase tracking-[0.36em] text-white/50">
              <span className="h-px w-12 bg-lumen/60" />
              {t("whyChoose.eyebrow")}
            </div>
            <motion.h2 variants={rise} className="font-display text-[clamp(2rem,5vw,3.25rem)] font-light tracking-tight text-white">
              {t("whyChoose.title")}{" "}
              <span className="font-serif italic text-lumen">{t("whyChoose.titleEmphasis")}</span>
            </motion.h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {WHY_CHOOSE_KEYS.map((key, i) => (
              <motion.div
                key={key}
                variants={fadeIn}
                custom={i}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-7 backdrop-blur-sm"
              >
                <h3 className="text-sm font-bold uppercase tracking-wide text-lumen">
                  {t(`whyChoose.items.${key}.title`)}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-white/70">
                  {t(`whyChoose.items.${key}.body`)}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </SectionShell>

      <SectionShell className="bg-gradient-to-b from-ivory to-paper">
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
        >
          <Eyebrow>{t("everyday.eyebrow")}</Eyebrow>
          <motion.h2 variants={rise} className="mb-12 font-display text-[clamp(2rem,5vw,3.25rem)] font-light tracking-tight">
            {t("everyday.title")}
          </motion.h2>

          <div className="grid gap-5 sm:grid-cols-2">
            {EVERYDAY_KEYS.map((key, i) => (
              <motion.div
                key={key}
                variants={fadeIn}
                custom={i}
                className="group relative overflow-hidden rounded-2xl border border-ink-black/[0.07] bg-paper p-7 shadow-[0_2px_24px_-8px_rgba(0,0,0,.06)] transition-shadow hover:shadow-[0_8px_40px_-12px_rgba(107,102,201,.15)]"
              >
                <div
                  className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-0 blur-2xl transition-opacity group-hover:opacity-100"
                  style={{ background: "radial-gradient(circle, rgba(107,102,201,.2), transparent 70%)" }}
                  aria-hidden
                />
                <h3 className="relative text-base font-bold text-ink-black">
                  {t(`everyday.items.${key}.title`)}
                </h3>
                <p className="relative mt-2 text-sm leading-relaxed text-slate">
                  {t(`everyday.items.${key}.body`)}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </SectionShell>

      <SectionShell className="relative overflow-hidden bg-midnight text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(60vmax 50vmax at 50% 50%, rgba(107,102,201,.25), transparent 65%)",
          }}
          aria-hidden
        />
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="relative z-10 text-center"
        >
          <motion.div variants={rise} className="mb-6 flex justify-center">
            <OluneLogo theme="dark" variant="mark" size="lg" />
          </motion.div>
          <motion.p variants={rise} className="text-[0.68rem] font-medium uppercase tracking-[0.3em] text-lumen/80">
            {t("promise.eyebrow")}
          </motion.p>
          <motion.h2
            variants={rise}
            className="mx-auto mt-4 max-w-[16ch] font-display text-[clamp(2.2rem,6vw,4rem)] font-light leading-tight tracking-tight"
          >
            {t("promise.title")}{" "}
            <span className="font-serif italic text-lumen">{t("promise.titleEmphasis")}</span>
          </motion.h2>
          <motion.p variants={rise} className="mx-auto mt-6 max-w-[52ch] text-lg leading-relaxed text-white/70">
            {t("promise.body")}
          </motion.p>
          <motion.div variants={rise} className="mt-10 flex flex-col items-center gap-3">
            <PrimaryButton href="/onboarding" className="bg-white text-ink-black hover:bg-lumen">
              {t("promise.cta")}
            </PrimaryButton>
            <p className="text-sm text-white/50">{t("promise.footnote")}</p>
          </motion.div>
        </motion.div>
      </SectionShell>

      <SectionShell id="pricing" className="bg-ivory">
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
        >
          <Eyebrow>{t("pricingSection.eyebrow")}</Eyebrow>
          <motion.h2 variants={rise} className="font-display text-[clamp(2rem,5vw,3.25rem)] font-light tracking-tight">
            {t("pricingSection.title")}{" "}
            <span className="font-serif italic text-iris">{t("pricingSection.titleEmphasis")}</span>
          </motion.h2>
          <motion.p variants={rise} className="mt-4 max-w-[52ch] text-lg text-slate">
            {t("pricingSection.subtitle")}
          </motion.p>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {PRICING_KEYS.map((key, i) => {
              const popular = key === "studio";
              return (
                <motion.div
                  key={key}
                  variants={fadeIn}
                  custom={i}
                  className={`relative flex flex-col rounded-2xl border p-8 ${
                    popular
                      ? "border-iris/40 bg-paper shadow-[0_20px_60px_-20px_rgba(107,102,201,.25)]"
                      : "border-ink-black/[0.08] bg-paper/80"
                  }`}
                >
                  {popular && (
                    <span className="absolute -top-3 left-6 rounded-full bg-iris px-3 py-1 text-[0.6rem] font-bold uppercase tracking-widest text-white">
                      {t("pricingSection.mostPopular")}
                    </span>
                  )}
                  <p className="text-sm font-bold uppercase tracking-wide text-ink-black">
                    {t(`pricingSection.plans.${key}.name`)}
                  </p>
                  <p className="mt-1 text-xs italic text-slate">{t(`pricingSection.plans.${key}.tag`)}</p>
                  <p className="mt-6 font-display text-4xl font-light tracking-tight">
                    {t(`pricingSection.plans.${key}.price`)}
                    <span className="text-base text-slate">{t("pricingSection.perMonth")}</span>
                  </p>
                  <p className="mt-4 flex-1 text-sm leading-relaxed text-slate">
                    {t(`pricingSection.plans.${key}.desc`)}
                  </p>
                  <Link
                    href="/onboarding"
                    className={`mt-8 inline-flex justify-center rounded-full px-6 py-3 text-xs font-bold uppercase tracking-wide transition-colors ${
                      popular
                        ? "bg-ink-black text-paper hover:bg-iris"
                        : "border border-ink-black/15 bg-paper text-ink-black hover:border-iris/40"
                    }`}
                  >
                    {t("startFree")}
                  </Link>
                </motion.div>
              );
            })}
          </div>

          <motion.div variants={rise} className="mt-10 rounded-xl border border-iris/20 bg-paper/60 p-6 backdrop-blur-sm">
            <p className="text-sm leading-relaxed text-slate">
              <span className="font-semibold text-ink-black">{t("pricingSection.includes")}</span>{" "}
              {t("pricingSection.includesBody")}
            </p>
            <blockquote className="mt-4 border-l-2 border-iris/30 pl-4 text-sm italic text-ink-black/80">
              <strong>{t("pricingSection.honestMath")}</strong> {t("pricingSection.honestMathBody")}
            </blockquote>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <PrimaryButton href="/onboarding">{t("startFree")}</PrimaryButton>
              <span className="text-sm text-slate">{t("pricingSection.trialNote")}</span>
            </div>
          </motion.div>
        </motion.div>
      </SectionShell>

      <SectionShell id="about" className="bg-gradient-to-br from-paper via-ivory to-mist/30">
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="grid items-center gap-12 lg:grid-cols-2"
        >
          <div>
            <Eyebrow>{t("aboutSection.eyebrow")}</Eyebrow>
            <motion.h2 variants={rise} className="font-display text-[clamp(2rem,5vw,3rem)] font-light leading-tight tracking-tight">
              {t("aboutSection.title")}{" "}
              <span className="font-serif italic text-iris">{t("aboutSection.titleEmphasis")}</span>
            </motion.h2>
            <motion.p variants={rise} className="mt-6 text-lg leading-relaxed text-slate">
              {t("aboutSection.body1")}
            </motion.p>
            <motion.p variants={rise} className="mt-4 text-lg leading-relaxed text-slate">
              {t("aboutSection.body2")}
            </motion.p>
            <motion.p variants={rise} className="mt-4 font-medium text-ink-black">
              {t("aboutSection.body3")}
            </motion.p>
            <motion.div variants={rise} className="mt-8 flex flex-wrap gap-4">
              <SecondaryButton href="#about">{t("aboutSection.meetTeam")}</SecondaryButton>
              <SecondaryButton href="#about">{t("aboutSection.ourStory")}</SecondaryButton>
            </motion.div>
          </div>

          <motion.div
            variants={rise}
            className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-ink-black/[0.08] shadow-[0_24px_80px_-24px_rgba(0,0,0,.12)]"
          >
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(135deg, rgba(107,102,201,.15) 0%, rgba(242,183,136,.12) 50%, rgba(250,248,243,1) 100%)",
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center p-10">
              <p className="max-w-[28ch] text-center font-display text-[clamp(1.5rem,3vw,2rem)] font-light leading-snug tracking-tight text-ink-black/90">
                &ldquo;{t("aboutSection.quote")}&rdquo;
              </p>
            </div>
          </motion.div>
        </motion.div>
      </SectionShell>

      <SectionShell id="compare" className="bg-paper">
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
        >
          <Eyebrow>{t("compareSection.eyebrow")}</Eyebrow>
          <motion.h2 variants={rise} className="font-display text-[clamp(2rem,5vw,3.25rem)] font-light tracking-tight">
            {t("compareSection.title")}
          </motion.h2>
          <motion.p variants={rise} className="mt-4 max-w-[58ch] text-lg text-slate">
            {t("compareSection.subtitle")}
          </motion.p>

          <motion.div
            variants={rise}
            className="mt-10 overflow-hidden rounded-2xl border border-ink-black/[0.08] shadow-[0_2px_24px_-8px_rgba(0,0,0,.06)]"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[540px] text-left text-sm">
                <thead>
                  <tr className="border-b border-ink-black/[0.08] bg-ivory/80">
                    <th className="px-6 py-4 font-medium text-slate" scope="col" />
                    <th className="px-6 py-4 font-bold uppercase tracking-wide text-slate" scope="col">
                      {t("compareSection.stackHeader")}
                    </th>
                    <th className="px-6 py-4 font-bold uppercase tracking-wide text-iris" scope="col">
                      <OluneLogo size="xs" className="inline-flex" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARE_ROW_KEYS.map((key, i) => (
                    <tr
                      key={key}
                      className={i % 2 === 0 ? "bg-paper" : "bg-ivory/40"}
                    >
                      <th className="px-6 py-4 font-semibold text-ink-black" scope="row">
                        {t(`compareSection.rows.${key}.label`)}
                      </th>
                      <td className="px-6 py-4 text-slate">{t(`compareSection.rows.${key}.stack`)}</td>
                      <td className="px-6 py-4 font-medium text-ink-black">
                        <span className="text-iris">✓</span> {t(`compareSection.rows.${key}.olune`)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          <motion.div variants={rise} className="mt-8 grid gap-4 sm:grid-cols-3">
            {COMPARE_HIGHLIGHT_KEYS.map((key) => (
              <div key={key} className="rounded-xl border border-ink-black/[0.06] bg-ivory/50 p-5">
                <p className="text-sm font-bold text-iris">{t(`compareSection.highlights.${key}.k`)}</p>
                <p className="mt-1 text-sm text-slate">{t(`compareSection.highlights.${key}.v`)}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </SectionShell>

      <LandingFooter />
    </div>
  );
}
