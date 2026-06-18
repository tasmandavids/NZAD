"use client";

// ============================================================================
//  WebsiteSetupWizard — single-page website setup with live preview tab.
//  All options on one screen; preview tab shows the homepage before generating.
// ============================================================================

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setupStudioWebsite } from "@/app/portal/admin/site/actions";
import { BlockRenderer } from "@/components/site/BlockRenderer";
import { HOME_TEMPLATES } from "@/lib/site/templates";
import { EDITOR_PREVIEW_CONTEXT } from "@/lib/site/preview-context";
import {
  FONT_PAIRS,
  SETUP_HOME_IDS,
  SETUP_PAGE_OPTIONS,
  buildSetupPages,
} from "@/lib/site/setup";

type Tab = "setup" | "preview";

export function WebsiteSetupWizard({
  studioName,
  defaultTagline,
}: {
  studioName: string;
  defaultTagline: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<Tab>("setup");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const homeOptions = HOME_TEMPLATES.filter((t) =>
    (SETUP_HOME_IDS as readonly string[]).includes(t.id),
  );

  const [homeId, setHomeId] = useState<string>("home-classic");
  const [fontPairId, setFontPairId] = useState<string>(FONT_PAIRS[0].id);
  const [tagline, setTagline] = useState(defaultTagline ?? "");
  const [pageIds, setPageIds] = useState<string[]>(
    () => SETUP_PAGE_OPTIONS.filter((p) => p.defaultChecked).map((p) => p.id),
  );

  const fontPair = FONT_PAIRS.find((f) => f.id === fontPairId) ?? FONT_PAIRS[0];

  const preview = useMemo(
    () =>
      buildSetupPages({
        homeTemplateId: homeId as (typeof SETUP_HOME_IDS)[number],
        pageTemplateIds: pageIds,
        studioName,
        tagline: tagline || null,
        fontDisplay: fontPair.display,
        fontBody: fontPair.body,
      }),
    [homeId, pageIds, studioName, tagline, fontPair],
  );

  const homeBlocks = preview[0]?.blocks ?? [];

  function togglePage(id: string) {
    setPageIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function runSetup() {
    startTransition(async () => {
      setError(null);
      const res = await setupStudioWebsite({
        homeTemplateId: homeId,
        pageTemplateIds: pageIds,
        tagline: tagline.trim() || null,
        fontDisplay: fontPair.display,
        fontBody: fontPair.body,
        publishHome: true,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDone(true);
      setTimeout(() => {
        router.push(`/portal/admin/site/${res.data.homePageId}`);
        router.refresh();
      }, 1200);
    });
  }

  if (done) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <section className="rounded-2xl border border-brand/30 bg-brand/5 p-8 text-center">
          <p className="text-3xl">✓</p>
          <h2 className="mt-2 text-xl font-bold text-ink">Your website is ready</h2>
          <p className="mt-1 text-sm text-muted">Opening the visual editor…</p>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 p-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Set up your website</h1>
          <p className="mt-1 text-sm text-muted">
            Configure everything on this page, then preview your homepage before generating.
            Everything stays editable in the visual editor afterward.
          </p>
        </div>
        <div className="flex shrink-0 rounded-full border border-[--hair] bg-surface p-1">
          <button
            type="button"
            onClick={() => setTab("setup")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              tab === "setup" ? "bg-brand text-white" : "text-muted hover:text-ink"
            }`}
          >
            Setup
          </button>
          <button
            type="button"
            onClick={() => setTab("preview")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              tab === "preview" ? "bg-brand text-white" : "text-muted hover:text-ink"
            }`}
          >
            Preview
          </button>
        </div>
      </header>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-500">{error}</p>
      )}

      {tab === "preview" ? (
        <section className="overflow-hidden rounded-2xl border border-[--hair] bg-base shadow-sm">
          <div className="flex items-center justify-between border-b border-[--hair] bg-surface px-4 py-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">Homepage preview</p>
            <p className="text-xs text-muted">{studioName}{tagline ? ` · ${tagline}` : ""}</p>
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            <BlockRenderer blocks={homeBlocks} context={EDITOR_PREVIEW_CONTEXT} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[--hair] bg-surface px-4 py-3">
            <p className="text-xs text-muted">
              {preview.length} page{preview.length === 1 ? "" : "s"} will be created · Homepage publishes on generate
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setTab("setup")} className="btn-glow px-5 py-2 text-sm">
                Back to setup
              </button>
              <button
                type="button"
                onClick={runSetup}
                disabled={pending}
                className="btn-glow btn-glow--solid px-6 py-2 text-sm disabled:opacity-50"
              >
                {pending ? "Generating…" : "Generate my website"}
              </button>
            </div>
          </div>
        </section>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left column: all setup options */}
          <div className="space-y-6">
            <section className="space-y-3 rounded-2xl border border-[--hair] bg-surface p-5">
              <h2 className="font-semibold text-ink">Homepage layout</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {homeOptions.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setHomeId(t.id)}
                    className={`rounded-xl border p-3 text-left transition ${
                      homeId === t.id ? "border-brand bg-brand/5" : "border-[--hair] hover:border-brand/50"
                    }`}
                  >
                    <span className="font-semibold text-ink">{t.label}</span>
                    <p className="mt-0.5 text-xs text-muted">{t.description}</p>
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-3 rounded-2xl border border-[--hair] bg-surface p-5">
              <h2 className="font-semibold text-ink">Typography</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {FONT_PAIRS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFontPairId(f.id)}
                    className={`rounded-xl border p-3 text-left transition ${
                      fontPairId === f.id ? "border-brand bg-brand/5" : "border-[--hair] hover:border-brand/50"
                    }`}
                  >
                    <span className="font-semibold text-ink">{f.label}</span>
                    <p className="mt-0.5 text-xs text-muted">{f.display} + {f.body}</p>
                  </button>
                ))}
              </div>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-ink">Tagline</span>
                <input
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="e.g. Auckland · All ages welcome"
                  className="field-premium"
                />
                <span className="mt-1 block text-xs text-muted">Shown on your homepage hero and site footer.</span>
              </label>
            </section>

            <section className="space-y-3 rounded-2xl border border-[--hair] bg-surface p-5">
              <h2 className="font-semibold text-ink">Starter pages</h2>
              <p className="text-sm text-muted">Uncheck any pages you don&apos;t need yet.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {SETUP_PAGE_OPTIONS.map((p) => (
                  <label
                    key={p.id}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-[--hair] bg-base px-3 py-2.5"
                  >
                    <input
                      type="checkbox"
                      checked={pageIds.includes(p.id)}
                      onChange={() => togglePage(p.id)}
                      className="h-4 w-4 accent-[--brand]"
                    />
                    <span className="text-sm text-ink">{p.label}</span>
                  </label>
                ))}
              </div>
            </section>
          </div>

          {/* Right column: summary + actions */}
          <div className="space-y-4">
            <section className="sticky top-6 space-y-4 rounded-2xl border border-[--hair] bg-surface p-5">
              <h2 className="font-semibold text-ink">Your site plan</h2>
              <p className="text-sm text-muted">
                Building for <strong className="text-ink">{studioName}</strong> with the{" "}
                <strong className="text-ink">{homeOptions.find((h) => h.id === homeId)?.label}</strong> homepage and{" "}
                <strong className="text-ink">{fontPair.label}</strong> fonts.
              </p>
              <ul className="space-y-1.5 text-sm text-ink">
                {preview.map((p) => (
                  <li key={p.slug} className="flex items-center justify-between rounded-lg bg-base px-3 py-2">
                    <span>{p.isHome ? "Homepage" : p.title}</span>
                    <span className="text-xs text-muted">/{p.isHome ? "" : p.slug}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTab("preview")}
                  className="btn-glow w-full px-6 py-2.5 text-sm"
                >
                  Open preview
                </button>
                <button
                  type="button"
                  onClick={runSetup}
                  disabled={pending}
                  className="btn-glow btn-glow--solid w-full px-6 py-2.5 text-sm disabled:opacity-50"
                >
                  {pending ? "Generating…" : "Generate my website"}
                </button>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
