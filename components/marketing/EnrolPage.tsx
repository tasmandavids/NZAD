"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { PoweredByOlune } from "@/components/brand/PoweredByOlune";

const DISCIPLINE_KEYS = [
  "ballet",
  "contemporary",
  "jazz",
  "hipHop",
  "tap",
  "lyrical",
  "acro",
  "pointe",
  "notSure",
] as const;

export default function EnrolPage({
  studioName,
  tagline,
  logoUrl = null,
}: {
  studioName: string;
  tagline: string | null;
  logoUrl?: string | null;
}) {
  const t = useTranslations("enrol");
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [interest, setInterest] = useState("");
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      await new Promise((r) => setTimeout(r, 600));
      setSubmitted(true);
    });
  };

  return (
    <div className="grid min-h-screen place-items-center bg-base p-6 text-ink">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={studioName}
              className="mx-auto mb-4 h-12 w-auto max-w-[200px] object-contain"
            />
          ) : null}
          <p className="text-xs uppercase tracking-widest text-muted">
            {tagline ?? studioName}
          </p>
          <h1 className="mt-2 text-3xl font-black uppercase tracking-tight">
            {t("title")}
          </h1>
          <p className="mt-2 text-sm text-muted">{t("subtitle")}</p>
        </div>

        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-3xl border border-[--hair] bg-surface p-8 text-center shadow-2xl"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.1 }}
                className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full text-2xl text-white"
                style={{ background: "var(--brand)" }}
              >
                ✓
              </motion.div>
              <h2 className="text-xl font-black">{t("success.title")}</h2>
              <p className="mt-2 text-sm text-muted">
                {t("success.body", {
                  name: name.split(" ")[0],
                  email,
                })}
              </p>
              <a
                href="/"
                className="btn-glow btn-glow--solid mt-6 inline-flex justify-center px-6 py-3 text-sm"
              >
                {t("success.backHome")}
              </a>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              onSubmit={onSubmit}
              className="rounded-3xl border border-[--hair] bg-surface p-7 shadow-2xl"
            >
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">
                    {t("fields.name")}
                  </span>
                  <input
                    type="text"
                    required
                    className="field-premium"
                    placeholder={t("fields.namePlaceholder")}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">
                    {t("fields.email")}
                  </span>
                  <input
                    type="email"
                    required
                    className="field-premium"
                    placeholder={t("fields.emailPlaceholder")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>

                <div>
                  <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted">
                    {t("fields.interest")}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {DISCIPLINE_KEYS.map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setInterest(key)}
                        className="rounded-full border px-3 py-1.5 text-xs font-medium transition-all"
                        style={{
                          borderColor: interest === key ? "var(--brand)" : "var(--hair)",
                          background: interest === key ? "var(--brand)" : "transparent",
                          color: interest === key ? "#fff" : "var(--muted)",
                        }}
                      >
                        {t(`disciplines.${key}`)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={pending || !name.trim() || !email.trim()}
                className="btn-glow btn-glow--solid mt-6 w-full justify-center disabled:opacity-50"
              >
                {pending ? t("submitting") : t("submit")}
              </button>

              <p className="mt-4 text-center text-xs text-muted">
                {t("hasAccount")}{" "}
                <a href="/login" className="text-ink underline">
                  {t("signIn")}
                </a>
              </p>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="mt-10 flex justify-center">
          <PoweredByOlune />
        </div>
      </div>
    </div>
  );
}
