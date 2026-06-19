"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors.generic");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-screen place-items-center bg-base px-6 text-ink">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand">{t("eyebrow")}</p>
        <h1 className="mt-2 text-2xl font-bold">{t("title")}</h1>
        <p className="mt-3 text-sm text-muted">{t("body")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="btn-glow btn-glow--solid px-5 py-2 text-sm"
          >
            {t("retry")}
          </button>
          <Link href="/" className="rounded-full border border-[--hair] px-5 py-2 text-sm text-ink">
            {t("goHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}
