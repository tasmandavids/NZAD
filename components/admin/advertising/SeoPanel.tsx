"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { applySeoModernization, runSeoAuditAction } from "@/app/portal/admin/advertising/actions";
import type { SeoAudit, SeoPageSnapshot } from "@/lib/advertising/types";

export function SeoPanel({
  pages,
  audits,
  onRefresh,
}: {
  pages: SeoPageSnapshot[];
  audits: SeoAudit[];
  onRefresh: () => void;
}) {
  const t = useTranslations("admin.advertising");
  const tShared = useTranslations("admin.shared");
  const [focusPageId, setFocusPageId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [lastSummary, setLastSummary] = useState<string | null>(null);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [auditing, startAudit] = useTransition();
  const [modernizing, startModernize] = useTransition();

  function handleAudit() {
    setError(null);
    startAudit(async () => {
      const res = await runSeoAuditAction(focusPageId || null);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setLastSummary(res.summary);
      setLastScore(res.score);
      onRefresh();
    });
  }

  function handleModernize(pageId: string) {
    setError(null);
    startModernize(async () => {
      const res = await applySeoModernization(pageId);
      if (!res.ok) setError(res.error);
      else onRefresh();
    });
  }

  const latestAudit = audits[0];
  const score = lastScore ?? latestAudit?.score ?? null;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[--hair] bg-surface p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-[0.62rem] font-semibold uppercase tracking-widest text-brand">{t("seo.badge")}</p>
            <h2 className="text-lg font-black text-ink">{t("seo.title")}</h2>
            <p className="mt-1 text-xs text-muted">{t("seo.description")}</p>
          </div>
          <span className="rounded-full bg-brand/10 px-3 py-1 text-[0.62rem] font-bold uppercase tracking-wide text-brand">
            {t("adCreator.aiAgent")}
          </span>
        </div>

        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink">{t("seo.auditScope")}</label>
            <select
              value={focusPageId}
              onChange={(e) => setFocusPageId(e.target.value)}
              className="w-full rounded-xl border border-[--hair] bg-base px-4 py-2.5 text-sm"
            >
              <option value="">{t("seo.allPages")}</option>
              {pages.map((p) => (
                <option key={p.id} value={p.id}>{t("seo.pageOption", { title: p.title, slug: p.slug })}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleAudit}
              disabled={auditing || pages.length === 0}
              className="w-full rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white hover:brightness-105 disabled:opacity-50"
            >
              {auditing ? tShared("runningAudit") : t("seo.runAudit")}
            </button>
          </div>
        </div>

        {score !== null && (
          <div className="mb-4 flex items-center gap-4 rounded-xl border border-[--hair] bg-base p-4">
            <div
              className="grid h-16 w-16 place-items-center rounded-full text-xl font-black text-white"
              style={{
                background: score >= 70 ? "#22c55e" : score >= 40 ? "#f59e0b" : "#ef4444",
              }}
            >
              {score}
            </div>
            <p className="flex-1 text-sm text-muted">{lastSummary ?? latestAudit?.aiSummary}</p>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {latestAudit && latestAudit.recommendations.length > 0 && (
        <div className="rounded-2xl border border-[--hair] bg-surface p-6">
          <h3 className="mb-4 font-bold text-ink">{t("seo.recommendations")}</h3>
          <div className="space-y-3">
            {latestAudit.recommendations.map((rec) => (
              <div key={rec.id} className="rounded-xl border border-[--hair] bg-base p-4">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[0.58rem] font-bold uppercase ${
                    rec.priority === "high" ? "bg-red-100 text-red-700"
                      : rec.priority === "medium" ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-600"
                  }`}>
                    {rec.priority}
                  </span>
                  <span className="text-[0.62rem] font-semibold uppercase tracking-wide text-muted">{rec.category}</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-ink">{rec.title}</p>
                <p className="mt-1 text-xs text-muted">{rec.description}</p>
                {rec.suggestedFix && (
                  <p className="mt-2 rounded-lg bg-brand/5 px-3 py-2 text-xs text-ink">
                    {t("seo.suggested", { fix: rec.suggestedFix })}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-[--hair] bg-surface p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-bold text-ink">{t("seo.pageSeo")}</h3>
          <Link href="/portal/admin/site" className="text-xs font-semibold text-brand hover:underline">
            {t("seo.openBuilder")}
          </Link>
        </div>
        <div className="space-y-3">
          {pages.length === 0 ? (
            <p className="text-sm text-muted">{t("seo.noPages")}</p>
          ) : (
            pages.map((page) => (
              <div key={page.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-[--hair] bg-base p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{page.title}</p>
                  <p className="text-[0.65rem] text-muted">/{page.slug} · {page.status}</p>
                  <p className="mt-2 text-xs text-ink">
                    {page.seoTitle || <span className="text-red-500">{t("seo.noSeoTitle")}</span>}
                  </p>
                  <p className="mt-0.5 text-xs text-muted line-clamp-2">
                    {page.seoDescription || t("seo.noMetaDescription")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleModernize(page.id)}
                  disabled={modernizing}
                  className="shrink-0 rounded-xl border border-brand/30 bg-brand/5 px-3 py-1.5 text-xs font-bold text-brand hover:bg-brand/10 disabled:opacity-50"
                >
                  {modernizing ? tShared("modernizing") : t("seo.aiModernize")}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
