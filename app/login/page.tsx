"use client";

// Minimal starter sign-in. Middleware routes you to the right /portal/<role>.

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { OluneLogo } from "@/components/brand/OluneLogo";
import { AuthDivider, OAuthButtons } from "@/components/auth/OAuthButtons";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";

function LoginForm() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const searchParams = useSearchParams();
  const next = searchParams?.get("next") ?? "/portal";
  const callbackError = searchParams?.get("error") === "auth_callback_error";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    callbackError ? t("callbackError") : null,
  );
  const [busy, setBusy] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: signInError } = await createClient().auth.signInWithPassword({
      email,
      password,
    });
    setBusy(false);
    if (signInError) return setError(signInError.message);
    // Full navigation so middleware sees the fresh session cookie.
    window.location.assign(next);
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex-1" />
        <OluneLogo variant="stacked" size="md" />
        <div className="flex flex-1 justify-end">
          <LanguageSwitcher compact />
        </div>
      </div>
      <div className="rounded-3xl border border-[--hair] bg-surface p-7 shadow-2xl">
        <h1 className="text-2xl font-black tracking-tight">{t("welcomeBack")}</h1>
        <p className="mt-1 text-sm text-muted">{t("signInSubtitle")}</p>

        <div className="mt-6">
          <OAuthButtons next={next} disabled={busy} />
        </div>

        <AuthDivider />

        <form onSubmit={signIn}>
          {error && (
            <p className="mb-4 rounded-lg border border-[--hair] bg-base/50 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          )}
          <div className="space-y-3">
            <input
              className="field-premium"
              type="email"
              required
              placeholder={t("emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="field-premium"
              type="password"
              required
              placeholder={t("passwordPlaceholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="btn-glow btn-glow--solid mt-6 w-full justify-center disabled:opacity-60"
          >
            {busy ? t("signingIn") : t("signInWithEmail")}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-muted">
          {t("newStudio")}{" "}
          <a href="/onboarding" className="text-ink underline">
            {t("getStarted")}
          </a>
        </p>
        <p className="mt-3 text-center text-xs text-muted">
          {t("platformAdmin")}{" "}
          <a href="/login?next=/platform" className="text-ink underline">
            {t("signInToPlatform")}
          </a>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const tCommon = useTranslations("common");

  return (
    <div className="grid min-h-screen place-items-center bg-base px-5 text-ink">
      <Suspense
        fallback={
          <div className="w-full max-w-sm rounded-3xl border border-[--hair] bg-surface p-7 text-center text-sm text-muted">
            {tCommon("loading")}
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
