"use client";

// ============================================================================
//  SiteManager — list + lifecycle controls for a studio's website pages.
// ============================================================================

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createPage,
  createPageFromTemplate,
  publishPage,
  unpublishPage,
  setHomePage,
  deletePage,
} from "@/app/portal/admin/site/actions";
import { HOME_TEMPLATES, PAGE_TEMPLATES } from "@/lib/site/templates";

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
      const res = await createPage({ title: title.trim() || (isHome ? "Home" : "New page"), isHome });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setTitle("");
      setCreating(false);
      router.push(`/portal/admin/site/${res.data.id}`);
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
    });

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      setError(null);
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Something went wrong.");
      else router.refresh();
    });

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-ink">Website</h1>
          <p className="text-sm text-muted">Build and publish your studio&apos;s public pages.</p>
        </div>
        <button
          onClick={() => setCreating((v) => !v)}
          className="btn-glow btn-glow--solid px-5 py-2 text-sm"
        >
          {creating ? "Cancel" : "+ New page"}
        </button>
      </header>

      {creating && (
        <div className="space-y-3 rounded-2xl border border-[--hair] bg-surface p-5">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-ink">Page title</span>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. About us"
              className="field-premium"
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => onCreate(false)}
              disabled={pending}
              className="btn-glow btn-glow--solid px-5 py-2 text-sm disabled:opacity-50"
            >
              Create page
            </button>
            {!hasHome && (
              <button
                onClick={() => onCreate(true)}
                disabled={pending}
                className="rounded-full border border-[--hair] px-5 py-2 text-sm text-ink transition hover:bg-base disabled:opacity-50"
              >
                Create as homepage
              </button>
            )}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      {!hasHome && (
        <section className="space-y-3 rounded-2xl border border-brand/30 bg-brand/5 p-5">
          <div>
            <h2 className="font-semibold text-ink">Choose a homepage style</h2>
            <p className="text-sm text-muted">
              Pick a ready-made layout to start from — every block is fully editable, and you publish
              when you&apos;re ready.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {HOME_TEMPLATES.map((t) => (
              <TemplateCard key={t.id} label={t.label} description={t.description} disabled={pending} onClick={() => onUseTemplate(t.id)} />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3 rounded-2xl border border-[--hair] bg-surface p-5">
        <div>
          <h2 className="font-semibold text-ink">Add a page from a template</h2>
          <p className="text-sm text-muted">
            Start a common page with sensible copy and layout already in place.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {PAGE_TEMPLATES.map((t) => (
            <TemplateCard key={t.id} label={t.label} description={t.description} disabled={pending} onClick={() => onUseTemplate(t.id)} />
          ))}
        </div>
      </section>

      {pages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[--hair] p-10 text-center text-muted">
          No pages yet. Pick a template above, or build one from scratch with “+ New page”.
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
                      Home
                    </span>
                  )}
                  <StatusBadge status={p.status} />
                </div>
                <p className="mt-0.5 truncate text-xs text-muted">/{p.isHome ? "" : p.slug}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/portal/admin/site/${p.id}`}
                  className="rounded-full border border-[--hair] px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-base"
                >
                  Edit
                </Link>
                {p.status === "published" ? (
                  <button
                    onClick={() => run(() => unpublishPage(p.id))}
                    disabled={pending}
                    className="rounded-full border border-[--hair] px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-base disabled:opacity-50"
                  >
                    Unpublish
                  </button>
                ) : (
                  <button
                    onClick={() => run(() => publishPage(p.id))}
                    disabled={pending}
                    className="rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
                  >
                    Publish
                  </button>
                )}
                {!p.isHome && (
                  <button
                    onClick={() => run(() => setHomePage(p.id))}
                    disabled={pending}
                    className="rounded-full border border-[--hair] px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-base disabled:opacity-50"
                  >
                    Set as home
                  </button>
                )}
                {confirmDelete === p.id ? (
                  <span className="flex items-center gap-1">
                    <button
                      onClick={() => run(() => deletePage(p.id))}
                      disabled={pending}
                      className="rounded-full bg-red-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="rounded-full border border-[--hair] px-3 py-1.5 text-xs text-muted"
                    >
                      No
                    </button>
                  </span>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(p.id)}
                    className="rounded-full px-3 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-500/10"
                  >
                    Delete
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
  label,
  description,
  disabled,
  onClick,
}: {
  label: string;
  description: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex h-full flex-col gap-1 rounded-xl border border-[--hair] bg-surface p-4 text-left transition hover:border-brand disabled:opacity-50"
    >
      <span className="font-semibold text-ink">{label}</span>
      <span className="text-xs text-muted">{description}</span>
    </button>
  );
}

function StatusBadge({ status }: { status: "draft" | "published" }) {
  const published = status === "published";
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider"
      style={{
        background: published ? "rgba(34,197,94,.15)" : "var(--hair)",
        color: published ? "#22c55e" : "var(--muted)",
      }}
    >
      {status}
    </span>
  );
}
