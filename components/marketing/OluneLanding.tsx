"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { landingFontVars } from "./landing/fonts";
import { NightScene } from "./landing/NightScene";
import { BentoGrid } from "./landing/BentoGrid";
import { JobsShowcase } from "./landing/JobsShowcase";
import { PricingTiers } from "./landing/PricingTiers";
import { CompareTable } from "./landing/CompareTable";
import { LandingHero } from "./landing/LandingHero";
import { LandingNav, LandingFooter, SectionShell, Eyebrow, PrimaryButton, SecondaryButton } from "./landing/ui";
import { container, rise, fadeIn } from "./landing/motion";

const WHY_KEYS = ["faster", "value", "craft"] as const;
const WHY_NUMERALS = ["I", "II", "III"] as const;
const EVERYDAY_KEYS = ["mornings", "money", "clients", "evenings"] as const;
const EVERYDAY_NUMERALS = ["I", "II", "III", "IV"] as const;

export default function OluneLanding() {
  const t = useTranslations("marketing");
  const oldWayItems = t.raw("problem.oldWayItems") as string[];

  return (
    <div
      className={`${landingFontVars} relative min-h-screen scroll-smooth bg-landing-paper font-[family-name:var(--font-landing-body)] text-landing-navy`}
    >
      <div className="bg-landing-ivory px-4 py-2.5 text-center text-sm text-landing-navy/60">
        Olune is currently under development — general release is due in early August.{" "}
        <span className="font-semibold">All plans are free to try as much as you like until then.</span>
      </div>

      <LandingNav />
      <LandingHero />

      {/* HUMAN BIT */}
      <SectionShell className="bg-landing-paper">
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="grid items-start gap-16 lg:grid-cols-[1fr_1.35fr]"
        >
          <motion.div variants={rise}>
            <Eyebrow>{t("problem.eyebrow")}</Eyebrow>
            <NightScene caption={t("problem.sceneCaption")} className="mt-6 aspect-[3/3.6]" />
          </motion.div>
          <div>
            <motion.h2
              variants={rise}
              className="font-[family-name:var(--font-landing-display)] mb-8 text-[clamp(34px,4.4vw,64px)] font-medium leading-[1.1] tracking-[-0.015em] text-landing-navy"
            >
              {t("problem.title")}
            </motion.h2>
            <motion.p variants={rise} className="mb-5 max-w-[640px] text-lg leading-[1.72] text-landing-navy/64">
              {t("problem.body1")}
            </motion.p>
            <motion.p variants={rise} className="max-w-[640px] text-lg leading-[1.72] text-landing-navy/64">
              {t("problem.body2")}
            </motion.p>
          </div>
        </motion.div>

        <motion.div
          variants={rise}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="mx-auto mt-20 grid max-w-[1120px] grid-cols-1 items-center gap-8 md:grid-cols-[1.25fr_auto_1fr]"
        >
          <div>
            <div className="mb-6 inline-flex items-center gap-2.5 text-[13px] font-bold uppercase tracking-[0.14em] text-landing-navy/46">
              <span className="h-1.5 w-1.5 rounded-full bg-landing-navy/28" />
              {t("problem.oldWay")}
            </div>
            <div className="flex max-w-[470px] flex-wrap gap-3">
              {oldWayItems.map((label, i) => (
                <div
                  key={label}
                  style={{ transform: `rotate(${(i % 2 ? 1 : -1) * (3 + (i % 4) * 2)}deg)` }}
                >
                  <span className="inline-flex items-center whitespace-nowrap rounded-full border border-landing-navy/10 bg-landing-navy/[0.05] px-4 py-2.5 text-sm font-medium text-landing-navy/50 transition-colors hover:border-landing-accent/40 hover:text-landing-navy">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="hidden justify-center text-[46px] text-landing-accent motion-safe:animate-[bobY_4s_ease-in-out_infinite] md:flex">
            →
          </div>
          <div>
            <div className="mb-6 inline-flex items-center gap-2.5 text-[13px] font-bold uppercase tracking-[0.14em] text-landing-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-landing-accent" />
              {t("problem.newWay")}
            </div>
            <div className="flex items-center gap-5 rounded-[20px] border border-landing-navy/[0.06] bg-white p-8 shadow-[0_40px_90px_-50px_rgba(26,21,53,0.5)]">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-landing-navy text-white drop-shadow-[0_6px_16px_rgba(139,124,240,0.5)]">
                ✦
              </span>
              <div>
                <div className="font-[family-name:var(--font-landing-display)] text-[27px] leading-none text-landing-navy">
                  olune
                </div>
                <div className="mt-1.5 text-[14.5px] text-landing-navy/56">{t("problem.newWayCaption")}</div>
              </div>
            </div>
          </div>
        </motion.div>
      </SectionShell>

      {/* BENTO — EVERYTHING IN ONE PLACE */}
      <SectionShell className="bg-gradient-to-b from-landing-ivory to-landing-paper">
        <BentoGrid />
      </SectionShell>

      {/* THREE JOBS */}
      <SectionShell id="features" className="bg-landing-ivory">
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="mb-14 text-center"
        >
          <Eyebrow>{t("featuresSection.eyebrow")}</Eyebrow>
          <motion.h2
            variants={rise}
            className="font-[family-name:var(--font-landing-display)] mt-2 text-[clamp(38px,5.2vw,78px)] font-medium leading-[1.05] tracking-[-0.02em] text-landing-navy"
          >
            {t("featuresSection.title")}{" "}
            <span className="italic text-landing-accent">{t("featuresSection.titleEmphasis")}</span>
          </motion.h2>
        </motion.div>
        <JobsShowcase />
      </SectionShell>

      {/* WHY STUDIOS */}
      <SectionShell id="why" className="bg-landing-paper">
        <motion.h2
          variants={rise}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="font-[family-name:var(--font-landing-display)] mb-16 text-center text-[clamp(38px,5.2vw,78px)] font-medium leading-[1.05] tracking-[-0.02em] text-landing-navy"
        >
          {t("whyChoose.title")} <span className="italic text-landing-accent">{t("whyChoose.titleEmphasis")}</span>
        </motion.h2>
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="grid grid-cols-1 gap-10 sm:grid-cols-3"
        >
          {WHY_KEYS.map((key, i) => (
            <motion.div
              key={key}
              variants={fadeIn}
              custom={i}
              className={`px-2 transition-transform hover:-translate-y-1.5 sm:px-8 ${
                i === 0 ? "" : "sm:border-l sm:border-landing-navy/[0.12]"
              }`}
            >
              <div className="font-[family-name:var(--font-landing-display)] text-[34px] italic text-landing-accent">
                {WHY_NUMERALS[i]}
              </div>
              <h3 className="font-[family-name:var(--font-landing-display)] my-4 text-[25px] font-medium leading-[1.25] text-landing-navy">
                {t(`whyChoose.items.${key}.title`)}
              </h3>
              <p className="text-base leading-relaxed text-landing-navy/58">
                {t(`whyChoose.items.${key}.body`)}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </SectionShell>

      {/* EVERYDAY DIFFERENCE */}
      <SectionShell className="bg-landing-ivory">
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="mb-16 text-center"
        >
          <div className="mb-4 flex items-center justify-center gap-2.5 text-[13px] font-bold uppercase tracking-[0.14em] text-landing-navy/46">
            <span className="h-1.5 w-1.5 rounded-full bg-landing-accent" />
            {t("everyday.eyebrow")}
          </div>
          <motion.h2
            variants={rise}
            className="font-[family-name:var(--font-landing-display)] text-[clamp(34px,4.8vw,64px)] font-medium leading-[1.08] tracking-[-0.018em] text-landing-navy"
          >
            {t("everyday.title")}
          </motion.h2>
        </motion.div>
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-4"
        >
          {EVERYDAY_KEYS.map((key, i) => (
            <motion.div
              key={key}
              variants={fadeIn}
              custom={i}
              className="rounded-[10px] border border-landing-navy/5 bg-white p-8 shadow-[0_24px_50px_-34px_rgba(26,21,53,0.35)] transition-all hover:-translate-y-3 hover:border-landing-accent/40 hover:shadow-[0_46px_78px_-34px_rgba(139,124,240,0.53)]"
            >
              <div className="font-[family-name:var(--font-landing-display)] text-[26px] italic text-landing-accent">
                {EVERYDAY_NUMERALS[i]}
              </div>
              <h3 className="font-[family-name:var(--font-landing-display)] my-3.5 text-[22px] font-medium leading-[1.25] text-landing-navy">
                {t(`everyday.items.${key}.title`)}
              </h3>
              <p className="text-[15.5px] leading-relaxed text-landing-navy/58">
                {t(`everyday.items.${key}.body`)}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </SectionShell>

      {/* PROMISE — CLIMAX */}
      <SectionShell dark className="overflow-hidden py-[clamp(6rem,14vw,10.6rem)] text-center">
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-60"
          style={{
            background: "radial-gradient(60vmax 50vmax at 50% 20%, rgba(139,124,240,.3), transparent 65%)",
          }}
          aria-hidden
        />
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="relative z-10 mx-auto max-w-[880px]"
        >
          <motion.div
            variants={rise}
            className="mx-auto mb-9 flex h-24 w-24 items-center justify-center rounded-full bg-[radial-gradient(circle_at_62%_40%,#d6ccff_0%,#8b7cf0_52%,#5b4bc4_100%)] shadow-[0_0_70px_rgba(139,124,240,.5)] motion-safe:animate-[bobY_7s_ease-in-out_infinite]"
          >
            <span className="text-3xl text-white">✦</span>
          </motion.div>
          <motion.p variants={rise} className="mb-6 text-[13px] font-bold uppercase tracking-[0.3em] text-white/60">
            {t("promise.eyebrow")}
          </motion.p>
          <motion.h2
            variants={rise}
            className="font-[family-name:var(--font-landing-display)] mb-8 text-[clamp(40px,6.6vw,96px)] font-medium italic leading-[1.05] tracking-[-0.02em] text-white"
          >
            {t("promise.title")} {t("promise.titleEmphasis")}
          </motion.h2>
          <motion.p variants={rise} className="mx-auto mb-12 max-w-[620px] text-lg leading-relaxed text-white/68">
            {t("promise.body")}
          </motion.p>
          <motion.div variants={rise}>
            <PrimaryButton href="/onboarding" className="bg-white text-landing-navy hover:bg-landing-accent">
              {t("promise.cta")}
            </PrimaryButton>
            <p className="mt-5 text-sm text-white/45">{t("promise.footnote")}</p>
          </motion.div>
        </motion.div>
      </SectionShell>

      {/* PRICING */}
      <SectionShell id="pricing" className="bg-landing-paper">
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="text-center"
        >
          <Eyebrow>{t("pricingSection.eyebrow")}</Eyebrow>
          <motion.h2
            variants={rise}
            className="font-[family-name:var(--font-landing-display)] mt-2 text-[clamp(38px,5.2vw,78px)] font-medium leading-[1.05] tracking-[-0.02em] text-landing-navy"
          >
            {t("pricingSection.title")}{" "}
            <span className="italic text-landing-accent">{t("pricingSection.titleEmphasis")}</span>
          </motion.h2>
          <motion.p variants={rise} className="mx-auto mt-5 max-w-[560px] text-lg leading-relaxed text-landing-navy/56">
            {t("pricingSection.subtitle")}
          </motion.p>
        </motion.div>

        <PricingTiers />

        <p className="mx-auto mt-14 max-w-[780px] text-center text-[14.5px] leading-relaxed text-landing-navy/48">
          {t("pricingSection.includes")} {t("pricingSection.includesBody")}
        </p>

        <div className="mx-auto mt-14 max-w-[760px] border-y border-landing-navy/[0.14] py-9 text-center">
          <p className="font-[family-name:var(--font-landing-display)] text-[clamp(19px,2.2vw,25px)] italic leading-relaxed text-landing-navy">
            <span className="mb-3.5 block text-[14px] font-semibold not-italic uppercase tracking-[0.08em] text-landing-accent">
              {t("pricingSection.honestMath")}
            </span>
            {t("pricingSection.honestMathBody")}
          </p>
        </div>

        <div className="mt-12 text-center">
          <PrimaryButton href="/onboarding">{t("startFree")}</PrimaryButton>
          <p className="mt-4 text-sm text-landing-navy/48">{t("pricingSection.trialNote")}</p>
        </div>
      </SectionShell>

      {/* ABOUT */}
      <SectionShell id="about" className="bg-landing-ivory">
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="grid items-stretch gap-16 lg:grid-cols-[0.9fr_1.1fr]"
        >
          <motion.div variants={rise} className="flex">
            <NightScene variant="orbit" caption={t("aboutSection.sceneCaption")} className="w-full min-h-[420px]" />
          </motion.div>
          <motion.div variants={rise}>
            <Eyebrow>{t("aboutSection.eyebrow")}</Eyebrow>
            <h2 className="font-[family-name:var(--font-landing-display)] mb-7 mt-1 text-[clamp(32px,4.4vw,56px)] font-medium leading-[1.12] tracking-[-0.018em] text-landing-navy">
              {t("aboutSection.title")}{" "}
              <span className="italic text-landing-accent">{t("aboutSection.titleEmphasis")}</span>
            </h2>
            <p className="mb-5 text-[17.5px] leading-relaxed text-landing-navy/62">{t("aboutSection.body1")}</p>
            <p className="mb-10 text-[17.5px] leading-relaxed text-landing-navy/62">{t("aboutSection.body2")}</p>
            <div className="mb-12 flex flex-wrap gap-9">
              <SecondaryButton href="#about">{t("aboutSection.meetTeam")}</SecondaryButton>
              <SecondaryButton href="#about">{t("aboutSection.ourStory")}</SecondaryButton>
            </div>
            <div className="grid grid-cols-3 gap-7 border-t border-landing-navy/[0.14] pt-10">
              {(["studioRun", "calm", "allInOne"] as const).map((key) => (
                <div key={key}>
                  <div className="mb-2 font-[family-name:var(--font-landing-display)] text-[22px] italic text-landing-accent">
                    {t(`aboutSection.principles.${key}.t`)}
                  </div>
                  <p className="text-sm leading-relaxed text-landing-navy/56">
                    {t(`aboutSection.principles.${key}.d`)}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-11 flex items-center gap-5 rounded-2xl border border-landing-navy/5 bg-white px-7 py-7 shadow-[0_30px_70px_-46px_rgba(26,21,53,0.45)]">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-landing-navy text-white drop-shadow-[0_6px_16px_rgba(139,124,240,0.5)]">
                ✦
              </span>
              <p className="font-[family-name:var(--font-landing-display)] text-[clamp(22px,2.4vw,30px)] italic leading-tight text-landing-navy">
                &ldquo;{t("aboutSection.quote")}&rdquo;
              </p>
            </div>
          </motion.div>
        </motion.div>
      </SectionShell>

      {/* COMPARE */}
      <SectionShell id="compare" className="bg-landing-paper">
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="mx-auto mb-14 max-w-[900px] text-center"
        >
          <Eyebrow>{t("compareSection.eyebrow")}</Eyebrow>
          <motion.h2
            variants={rise}
            className="font-[family-name:var(--font-landing-display)] mt-2 text-[clamp(36px,4.8vw,66px)] font-medium leading-[1.08] tracking-[-0.02em] text-landing-navy"
          >
            {t("compareSection.title")}
          </motion.h2>
          <motion.p variants={rise} className="mx-auto mt-6 max-w-[620px] text-[17.5px] leading-relaxed text-landing-navy/56">
            {t("compareSection.subtitle")}
          </motion.p>
        </motion.div>

        <CompareTable />
      </SectionShell>

      <LandingFooter />
    </div>
  );
}
