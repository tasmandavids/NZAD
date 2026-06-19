"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { derivePalette } from "@/lib/branding";
import { OluneLogo } from "@/components/brand/OluneLogo";
import { AuthDivider, OAuthButtons } from "@/components/auth/OAuthButtons";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";

const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "olune.app";
const EASE = [0.16, 1, 0.3, 1] as const;
const PRESETS = ["#C8102E", "#5B5BFF", "#C9A227", "#E84A8A", "#13B6A4"];

type Step = "account" | "studio" | "brand" | "done";
type SlugStatus = "idle" | "invalid" | "checking" | "available" | "taken";

const PROGRESS_KEYS = ["account", "studio", "brand"] as const;

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export function OnboardingWizard({ signedIn, email: initialEmail = "" }: { signedIn: boolean; email?: string }) {
  const t = useTranslations("onboarding");
  const router = useRouter();
  const reduce = useReducedMotion();

  const [step, setStep] = useState<Step>(signedIn ? "studio" : "account");
  const [dir, setDir] = useState(1);
  const go = (next: Step, d = 1) => { setDir(d); setStep(next); };

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [studioName, setStudioName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [slugStatus, setSlugStatus] = useState<SlugStatus>("idle");
  const [brand, setBrand] = useState(PRESETS[0]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);

  useEffect(() => { if (!slugEdited) setSlug(slugify(studioName)); }, [studioName, slugEdited]);

  useEffect(() => {
    if (step !== "studio") return;
    const s = slug;
    if (!/^[a-z0-9-]{3,32}$/.test(s)) { setSlugStatus(s ? "invalid" : "idle"); return; }
    setSlugStatus("checking");
    const timer = setTimeout(async () => {
      const { data } = await createClient().from("studios").select("id").eq("slug", s).maybeSingle();
      setSlugStatus(data ? "taken" : "available");
    }, 450);
    return () => clearTimeout(timer);
  }, [slug, step]);

  async function createAccount(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const { data, error: signUpError } = await createClient().auth.signUp({ email, password });
    setBusy(false);
    if (signUpError) return setError(signUpError.message);
    if (data.session) go("studio");
    else setAwaitingConfirm(true);
  }

  async function createStudio() {
    setBusy(true); setError(null);
    const supabase = createClient();
    const { data: studioId, error: rpcError } = await supabase.rpc("create_studio_for_user", {
      p_name: studioName,
      p_slug: slug,
    });
    if (rpcError) { setBusy(false); return setError(rpcError.message); }

    if (brand !== "#C8102E" && studioId) {
      const p = derivePalette(brand);
      await supabase.from("studio_branding")
        .update({ brand_color: brand, brand_hot: p.brandHot, brand_deep: p.brandDeep })
        .eq("studio_id", studioId);
    }
    go("done");
    setTimeout(() => { router.push("/setup"); router.refresh(); }, 1300);
  }

  const stepIndex = { account: 0, studio: 1, brand: 2, done: 3 }[step];
  const initial = (studioName.trim()[0] ?? "S").toUpperCase();

  const variants = {
    enter: (d: number) => ({ x: reduce ? 0 : d > 0 ? 36 : -36, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: reduce ? 0 : d > 0 ? -36 : 36, opacity: 0 }),
  };

  return (
    <div className="grid min-h-screen place-items-center bg-base px-5 py-12 text-ink">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div className="flex-1" />
          <OluneLogo variant="stacked" size="md" />
          <div className="flex flex-1 justify-end">
            <LanguageSwitcher compact />
          </div>
        </div>

        {step !== "done" && (
          <div className="mb-8 flex items-center justify-center gap-2">
            {PROGRESS_KEYS.map((key, i) => (
              <div key={key} className="flex items-center gap-2">
                <span className="text-xs" style={{ color: i <= stepIndex ? "var(--brand-hot)" : "var(--muted)" }}>
                  {t(`progress.${key}`)}
                </span>
                {i < 2 && <span className="h-px w-6" style={{ background: i < stepIndex ? "var(--brand)" : "var(--hair)" }} />}
              </div>
            ))}
          </div>
        )}

        <div className="rounded-3xl border border-[--hair] bg-surface p-7 shadow-2xl">
          {error && <p className="mb-4 rounded-lg border border-[--hair] bg-base/50 px-3 py-2 text-sm text-red-400">{error}</p>}

          {awaitingConfirm ? (
            <div className="text-center">
              <h1 className="text-xl font-black">{t("confirmEmail.title")}</h1>
              <p className="mt-2 text-sm text-muted">
                {t("confirmEmail.body", { email })}
              </p>
            </div>
          ) : (
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div key={step} custom={dir} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.35, ease: EASE }}>

                {step === "account" && (
                  <div>
                    <h1 className="text-2xl font-black tracking-tight">{t("account.title")}</h1>
                    <p className="mt-1 text-sm text-muted">{t("account.subtitle")}</p>

                    <div className="mt-6">
                      <OAuthButtons next="/onboarding" disabled={busy} />
                    </div>

                    <AuthDivider label={t("account.divider")} />

                    <form onSubmit={createAccount}>
                      <div className="space-y-3">
                        <input className="field-premium" type="email" required placeholder={t("account.emailPlaceholder")}
                          value={email} onChange={(e) => setEmail(e.target.value)} />
                        <input className="field-premium" type="password" required minLength={6} placeholder={t("account.passwordPlaceholder")}
                          value={password} onChange={(e) => setPassword(e.target.value)} />
                      </div>
                      <button type="submit" disabled={busy} className="btn-glow btn-glow--solid mt-6 w-full justify-center disabled:opacity-60">
                        {busy ? t("account.submitting") : t("account.submit")}
                      </button>
                      <p className="mt-4 text-center text-sm text-muted">
                        {t("account.hasAccount")}{" "}
                        <a href="/login" className="text-ink underline">{t("account.logIn")}</a>
                      </p>
                    </form>
                  </div>
                )}

                {step === "studio" && (
                  <div>
                    <h1 className="text-2xl font-black tracking-tight">{t("studio.title")}</h1>
                    <p className="mt-1 text-sm text-muted">{t("studio.subtitle")}</p>
                    <div className="mt-6 space-y-4">
                      <input className="field-premium" type="text" placeholder={t("studio.namePlaceholder")}
                        value={studioName} onChange={(e) => setStudioName(e.target.value)} autoFocus />
                      <div>
                        <div className="flex items-center overflow-hidden rounded-xl border border-[--hair] bg-base/40 focus-within:border-[--brand]">
                          <input className="flex-1 bg-transparent px-3 py-2.5 text-sm outline-none" value={slug}
                            onChange={(e) => { setSlugEdited(true); setSlug(slugify(e.target.value)); }} placeholder={t("studio.slugPlaceholder")} />
                          <span className="px-3 text-sm text-muted">.{ROOT}</span>
                        </div>
                        <p className="mt-1.5 h-4 text-xs">
                          {slugStatus === "checking" && <span className="text-muted">{t("studio.checking")}</span>}
                          {slugStatus === "available" && <span style={{ color: "var(--brand-hot)" }}>{t("studio.available", { slug, root: ROOT })}</span>}
                          {slugStatus === "taken" && <span className="text-red-400">{t("studio.taken")}</span>}
                          {slugStatus === "invalid" && <span className="text-red-400">{t("studio.invalid")}</span>}
                        </p>
                      </div>
                    </div>
                    <div className="mt-6 flex gap-2">
                      {!signedIn && <button onClick={() => go("account", -1)} className="btn-glow flex-none">{t("studio.back")}</button>}
                      <button onClick={() => go("brand")} disabled={slugStatus !== "available"}
                        className="btn-glow btn-glow--solid w-full justify-center disabled:opacity-50">{t("studio.continue")}</button>
                    </div>
                  </div>
                )}

                {step === "brand" && (
                  <div>
                    <h1 className="text-2xl font-black tracking-tight">{t("brand.title")}</h1>
                    <p className="mt-1 text-sm text-muted">{t("brand.subtitle")}</p>

                    <div className="mt-5 rounded-2xl border border-[--hair] bg-base p-5">
                      <div className="flex items-center gap-2">
                        <span className="grid h-8 w-8 place-items-center border text-sm font-black text-ink" style={{ borderColor: brand }}>{initial}</span>
                        <span className="text-sm font-bold text-ink">{studioName || t("brand.fallbackName")}</span>
                      </div>
                      <button className="mt-4 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-paper" style={{ background: brand }}>{t("brand.previewCta")}</button>
                    </div>

                    <div className="mt-5 flex items-center gap-3">
                      {PRESETS.map((c) => (
                        <button key={c} onClick={() => setBrand(c)} aria-label={c}
                          className="h-8 w-8 rounded-full transition-transform hover:scale-110"
                          style={{ background: c, boxShadow: brand === c ? "0 0 0 2px var(--surface), 0 0 0 4px #fff" : "none" }} />
                      ))}
                      <input type="color" value={brand} onChange={(e) => setBrand(e.target.value)}
                        className="ml-auto h-8 w-10 cursor-pointer rounded-lg border border-[--hair] bg-transparent p-0.5" aria-label={t("brand.customColour")} />
                    </div>

                    <div className="mt-6 flex gap-2">
                      <button onClick={() => go("studio", -1)} className="btn-glow flex-none">{t("brand.back")}</button>
                      <button onClick={createStudio} disabled={busy} className="btn-glow btn-glow--solid w-full justify-center disabled:opacity-60">
                        {busy ? t("brand.submitting") : t("brand.submit")}
                      </button>
                    </div>
                  </div>
                )}

                {step === "done" && (
                  <div className="text-center">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 18 }}
                      className="mx-auto grid h-14 w-14 place-items-center rounded-full text-2xl text-white" style={{ background: brand }}>✓</motion.div>
                    <h1 className="mt-4 text-2xl font-black">{t("done.title", { studioName })}</h1>
                    <p className="mt-1 text-sm text-muted">{t("done.subtitle")}</p>
                    <a href="/setup" className="btn-glow btn-glow--solid mt-6 inline-flex justify-center">{t("done.continue")}</a>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}
