"use client";

// ============================================================================
//  WebsiteSetupWizard — guided first-time website setup for studio owners.
//  Pick homepage style, fonts, tagline, starter pages → generate & publish.
// ============================================================================

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setupStudioWebsite } from "@/app/portal/admin/site/actions";
import { HOME_TEMPLATES } from "@/lib/site/templates";
import {
  FONT_PAIRS,
  SETUP_HOME_IDS,
  SETUP_PAGE_OPTIONS,
  buildSetupPages,
} from "@/lib/site/setup";

type Step = "style" | "brand" | "pages" | "done";

export function WebsiteSetupWizard({
  studioName,
  defaultTagline,
}: {
  studioName: string;
  defaultTagline: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<Step>("style");
  const [error, setError] = useState<string | null>(null);

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
      setStep("done");
      setTimeout(() => {
        router.push(`/portal/admin/site/${res.data.homePageId}`);
        router.refresh();
      }, 1200);
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold text-ink">Set up your website</h1>
        <p className="mt-1 text-sm text-muted">
          Choose your look and starter pages for <strong className="text-ink">{studioName}</strong>.
          Everything is editable after setup.
        </p>
      </header>

      {/* Progress */}
      <div className="flex items-center gap-2 text-xs">
        {(["style", "brand", "pages"] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <span className={step === s || (step === "done" && i < 3) ? "text-brand font-semibold" : "text-muted"}>
              {i + 1}. {s === "style" ? "Homepage" : s === "brand" ? "Style" : "Pages"}
            </span>
            {i < 2 && <span className="h-px w-8 bg-[--hair]" />}
          </div>
        ))}
      </div>

      {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-500">{error}</p>}

      {step === "style" && (
        <section className="space-y-4">
          <h2 className="font-semibold text-ink">Pick a homepage layout</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {homeOptions.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setHomeId(t.id)}
                className={`rounded-xl border p-4 text-left transition ${
                  homeId === t.id ? "border-brand bg-brand/5" : "border-[--hair] hover:border-brand/50"
                }`}
              >
                <span className="font-semibold text-ink">{t.label}</span>
                <p className="mt-1 text-xs text-muted">{t.description}</p>
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setStep("brand")} className="btn-glow btn-glow--solid px-6 py-2 text-sm">
            Continue
          </button>
        </section>
      )}

      {step === "brand" && (
        <section className="space-y-4">
          <h2 className="font-semibold text-ink">Typography & tagline</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {FONT_PAIRS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFontPairId(f.id)}
                className={`rounded-xl border p-4 text-left transition ${
                  fontPairId === f.id ? "border-brand bg-brand/5" : "border-[--hair] hover:border-brand/50"
                }`}
              >
                <span className="font-semibold text-ink">{f.label}</span>
                <p className="mt-1 text-xs text-muted">{f.display} + {f.body}</p>
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
          <div className="flex gap-2">
            <button type="button" onClick={() => setStep("style")} className="btn-glow px-5 py-2 text-sm">Back</button>
            <button type="button" onClick={() => setStep("pages")} className="btn-glow btn-glow--solid px-6 py-2 text-sm">Continue</button>
          </div>
        </section>
      )}

      {step === "pages" && (
        <section className="space-y-4">
          <h2 className="font-semibold text-ink">Starter pages</h2>
          <p className="text-sm text-muted">We&apos;ll create these pages with your studio name baked in. Uncheck any you don&apos;t need yet.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {SETUP_PAGE_OPTIONS.map((p) => (
              <label
                key={p.id}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-[--hair] bg-surface px-4 py-3"
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

          <div className="rounded-xl border border-[--hair] bg-base/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">Preview</p>
            <ul className="mt-2 space-y-1 text-sm text-ink">
              {preview.map((p) => (
                <li key={p.slug}>
                  {p.isHome ? "Homepage" : p.title} <span className="text-muted">/{p.isHome ? "" : p.slug}</span>
                  {p.isHome && <span className="ml-2 text-xs text-brand">(published on generate)</span>}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={() => setStep("brand")} className="btn-glow px-5 py-2 text-sm">Back</button>
            <button
              type="button"
              onClick={runSetup}
              disabled={pending}
              className="btn-glow btn-glow--solid px-6 py-2 text-sm disabled:opacity-50"
            >
              {pending ? "Generating…" : "Generate my website"}
            </button>
          </div>
        </section>
      )}

      {step === "done" && (
        <section className="rounded-2xl border border-brand/30 bg-brand/5 p-8 text-center">
          <p className="text-3xl">✓</p>
          <h2 className="mt-2 text-xl font-bold text-ink">Your website is ready</h2>
          <p className="mt-1 text-sm text-muted">Opening the homepage editor…</p>
        </section>
      )}
    </div>
  );
}
