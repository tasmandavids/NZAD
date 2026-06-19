"use client";

// ============================================================================
//  SiteManager — list + lifecycle controls for a studio's website pages.
// ============================================================================

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  createPage,
  createPageFromTemplate,
  publishPage,
  unpublishPage,
  setHomePage,
  deletePage,
} from "@/app/portal/admin/site/actions";
import { HOME_TEMPLATES, PAGE_TEMPLATES } from "@/lib/site/templates";
import { TemplateGallery } from "@/components/admin/site/TemplateGallery";
import { templateDescription, templateLabel } from "@/lib/site/i18n-labels";

export type SitePageRow = {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published";
  isHome: boolean;
  showInNav: boolean;
  navOrder: number;
  updatedAt: string;
};

export default function SiteManager({ pages }: { pages: SitePageRow[] }) {
  const t = useTranslations("site.manager");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const hasHome = pages.some((p) => p.isHome);

  const onCreate = (isHome: boolean) =>
    startTransition(async () => {
      setError(null);
      const res = await createPage({ title: title.trim() || (isHome ? t("defaultHomeTitle") : t("defaultPageTitle")), isHome });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setTitle("");
      setCreating(false);
      router.push(`/portal/admin/site/${res.data.id}`);
      router.refresh();
    });

  const onUseTemplate = (templateId: string) =>
    startTransition(async () => {
      setError(null);
      const res = await createPageFromTemplate(templateId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/portal/admin/site/${res.data.id}`);
      router.refresh();
    });

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      setError(null);
      const res = await fn();
      if (!res.ok) setError(res.error ?? t("somethingWrong"));
      else router.refresh();
    });

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-ink">{t("title")}</h1>
          <p className="text-sm text-muted">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/portal/admin/site/domain"
            className="rounded-full border border-[--hair] px-4 py-2 text-sm font-medium text-ink transition hover:border-brand hover:text-brand"
          >
            {t("domainSetup")}
          </Link>
          <button
            onClick={() => setCreating((v) => !v)}
            className="btn-glow btn-glow--solid px-5 py-2 text-sm"
          >
            {creating ? tCommon("cancel") : t("newPage")}
          </button>
        </div>
      </header>

      {creating && (
        <div className="space-y-3 rounded-2xl border border-[--hair] bg-surface p-5">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-ink">{t("pageTitle")}</span>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("pageTitlePlaceholder")}
              className="field-premium"
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => onCreate(false)}
              disabled={pending}
              className="btn-glow btn-glow--solid px-5 py-2 text-sm disabled:opacity-50"
            >
              {t("createPage")}
            </button>
            {!hasHome && (
              <button
                onClick={() => onCreate(true)}
                disabled={pending}
                className="rounded-full border border-[--hair] px-5 py-2 text-sm text-ink transition hover:bg-base disabled:opacity-50"
              >
                {t("createAsHomepage")}
              </button>
            )}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      {!hasHome && (
        <section className="space-y-3 rounded-2xl border border-brand/30 bg-brand/5 p-5">
          <div>
            <h2 className="font-semibold text-ink">{t("chooseHomepageStyle")}</h2>
            <p className="text-sm text-muted">
              {t("homepageBrowse", { count: HOME_TEMPLATES.length })}
            </p>
          </div>
          <TemplateGallery
            templates={HOME_TEMPLATES}
            selectedId=""
            onSelect={onUseTemplate}
            disabled={pending}
          />
        </section>
      )}

      <section className="space-y-3 rounded-2xl border border-[--hair] bg-surface p-5">
        <div>
          <h2 className="font-semibold text-ink">{t("addPageFromTemplate")}</h2>
          <p className="text-sm text-muted">{t("addPageFromTemplateHint")}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {PAGE_TEMPLATES.map((tpl) => (
            <TemplateCard key={tpl.id} templateId={tpl.id} disabled={pending} onClick={() => onUseTemplate(tpl.id)} />
          ))}
        </div>
      </section>

      {pages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[--hair] p-10 text-center text-muted">
          {t("noPagesYet")}
        </div>
      ) : (
        <ul className="space-y-3">
          {pages.map((p) => (
            <li
              key={p.id}
              className="flex flex-col gap-3 rounded-2xl border border-[--hair] bg-surface p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Link href={`/portal/admin/site/${p.id}`} className="font-semibold text-ink hover:text-brand">
                    {p.title}
                  </Link>
                  {p.isHome && (
                    <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-brand">
                      {t("home")}
                    </span>
                  )}
                  <StatusBadge status={p.status} draftLabel={t("statusDraft")} publishedLabel={t("statusPublished")} />
                </div>
                <p className="mt-0.5 truncate text-xs text-muted">/{p.isHome ? "" : p.slug}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/portal/admin/site/${p.id}`}
                  className="rounded-full border border-[--hair] px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-base"
                >
                  {tCommon("edit")}
                </Link>
                {p.status === "published" ? (
                  <button
                    onClick={() => run(() => unpublishPage(p.id))}
                    disabled={pending}
                    className="rounded-full border border-[--hair] px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-base disabled:opacity-50"
                  >
                    {t("unpublish")}
                  </button>
                ) : (
                  <button
                    onClick={() => run(() => publishPage(p.id))}
                    disabled={pending}
                    className="rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
                  >
                    {t("publish")}
                  </button>
                )}
                {!p.isHome && (
                  <button
                    onClick={() => run(() => setHomePage(p.id))}
                    disabled={pending}
                    className="rounded-full border border-[--hair] px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-base disabled:opacity-50"
                  >
                    {t("setAsHome")}
                  </button>
                )}
                {confirmDelete === p.id ? (
                  <span className="flex items-center gap-1">
                    <button
                      onClick={() => run(() => deletePage(p.id))}
                      disabled={pending}
                      className="rounded-full bg-red-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      {t("confirm")}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="rounded-full border border-[--hair] px-3 py-1.5 text-xs text-muted"
                    >
                      {tCommon("no")}
                    </button>
                  </span>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(p.id)}
                    className="rounded-full px-3 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-500/10"
                  >
                    {tCommon("delete")}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TemplateCard({
  templateId,
  disabled,
  onClick,
}: {
  templateId: string;
  disabled: boolean;
  onClick: () => void;
}) {
  const t = useTranslations("site");
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex h-full flex-col gap-1 rounded-xl border border-[--hair] bg-surface p-4 text-left transition hover:border-brand disabled:opacity-50"
    >
      <span className="font-semibold text-ink">{templateLabel(t, templateId)}</span>
      <span className="text-xs text-muted">{templateDescription(t, templateId)}</span>
    </button>
  );
}

function StatusBadge({
  status,
  draftLabel,
  publishedLabel,
}: {
  status: "draft" | "published";
  draftLabel: string;
  publishedLabel: string;
}) {
  const published = status === "published";
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider"
      style={{
        background: published ? "rgba(34,197,94,.15)" : "var(--hair)",
        color: published ? "#22c55e" : "var(--muted)",
      }}
    >
      {published ? publishedLabel : draftLabel}
    </span>
  );
}
