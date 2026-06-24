"use client";

import { useTranslations } from "next-intl";
import { useFormatDateMedium } from "@/lib/i18n/client";
import type { CertificateItem } from "@/lib/portal/student-progress-data";

function downloadHref(progressId: string, title: string): string {
  const params = new URLSearchParams({ progressId, title });
  return `/api/certificates/download?${params.toString()}`;
}

export default function CertificateDownloads({ certificates }: { certificates: CertificateItem[] }) {
  const t = useTranslations("portal.progress.certificates");
  const formatWhen = useFormatDateMedium();

  if (certificates.length === 0) return null;

  return (
    <section className="rounded-2xl border border-[--hair] bg-surface p-5">
      <h2 className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted">
        {t("title", { count: certificates.length })}
      </h2>
      <p className="mb-4 text-sm text-muted">{t("subtitle")}</p>

      <ul className="space-y-3">
        {certificates.map((cert) => (
          <li
            key={`${cert.progressId}:${cert.title}`}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[--hair] bg-base px-4 py-3"
          >
            <div className="min-w-0">
              <p className="font-semibold text-ink">🏅 {cert.title}</p>
              <p className="mt-0.5 text-xs text-muted">
                {formatWhen(cert.awardedAt)}
                {cert.instructorName ? ` · ${cert.instructorName}` : ""}
              </p>
            </div>
            <a
              href={downloadHref(cert.progressId, cert.title)}
              download
              className="shrink-0 rounded-xl border border-[--hair] px-4 py-2 text-xs font-bold text-ink transition-colors hover:border-[--brand] hover:text-[--brand]"
              aria-label={t("downloadAria", { title: cert.title })}
            >
              {t("downloadPdf")}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
