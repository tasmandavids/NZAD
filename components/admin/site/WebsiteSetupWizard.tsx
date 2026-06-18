"use client";

// ============================================================================
//  WebsiteSetupWizard — single-page website setup with live preview tab.
//  20 homepage templates, 30 typography pairings, instant branding apply.
// ============================================================================

import { useMemo, useState, useTransition, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { setupStudioWebsite } from "@/app/portal/admin/site/actions";
import { BlockRenderer } from "@/components/site/BlockRenderer";
import { SiteHeader } from "@/components/site/SiteHeader";
import { TemplateGallery } from "@/components/admin/site/TemplateGallery";
import { TypographyGallery } from "@/components/admin/site/TypographyGallery";
import { BrandingQuickApply, type BrandingDraft } from "@/components/admin/site/BrandingQuickApply";
import { HOME_TEMPLATES } from "@/lib/site/templates";
import { EDITOR_PREVIEW_CONTEXT } from "@/lib/site/preview-context";
import {
  SETUP_PAGE_OPTIONS,
  buildSetupPages,
  getTemplateBrandingSuggestion,
} from "@/lib/site/setup";
import { brandingToCssVars } from "@/lib/branding";
import { buildSetupNavLinks } from "@/lib/site/page-links";
import { googleFontsStylesheetUrl } from "@/lib/fonts";
import type { TypographyPair } from "@/lib/site/typography";
import type { ThemeBase } from "@/lib/types";

type Tab = "setup" | "preview";

type InitialBranding = {
  tagline: string | null;
  logoUrl: string | null;
  brandColor: string;
  base: ThemeBase;
  fontDisplay: string;
  fontBody: string;
};

export function WebsiteSetupWizard({
  studioName,
  initialBranding,
}: {
  studioName: string;
  initialBranding: InitialBranding;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<Tab>("setup");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [homeId, setHomeId] = useState("home-classic");
  const [fontPairId, setFontPairId] = useState("fraunces-hanken");
  const [fontDisplay, setFontDisplay] = useState(initialBranding.fontDisplay);
  const [fontBody, setFontBody] = useState(initialBranding.fontBody);
  const [branding, setBranding] = useState<BrandingDraft>({
    brandColor: initialBranding.brandColor,
    base: initialBranding.base,
    logoUrl: initialBranding.logoUrl ?? "",
    tagline: initialBranding.tagline ?? "",
  });
  const [pageIds, setPageIds] = useState<string[]>(
    () => SETUP_PAGE_OPTIONS.filter((p) => p.defaultChecked).map((p) => p.id),
  );
  const [brandingTouched, setBrandingTouched] = useState(false);

  const preview = useMemo(
    () =>
      buildSetupPages({
        homeTemplateId: homeId,
        pageTemplateIds: pageIds,
        studioName,
        tagline: branding.tagline || null,
        fontDisplay,
        fontBody,
        brandColor: branding.brandColor,
        base: branding.base,
        logoUrl: branding.logoUrl || null,
      }),
    [homeId, pageIds, studioName, branding, fontDisplay, fontBody],
  );

  const previewVars = useMemo(
    () =>
      brandingToCssVars({
        studioId: "",
        tagline: branding.tagline || null,
        logoUrl: branding.logoUrl || null,
        brandColor: branding.brandColor,
        base: branding.base,
        fontDisplay,
        fontBody,
        siteSettings: { showPoweredBy: true, portalLabel: "Portal" },
      }) as CSSProperties,
    [branding, fontDisplay, fontBody],
  );

  const fontsUrl = googleFontsStylesheetUrl(fontDisplay, fontBody);
  const homeBlocks = preview[0]?.blocks ?? [];
  const selectedTemplate = HOME_TEMPLATES.find((t) => t.id === homeId);
  const setupNav = useMemo(
    () =>
      buildSetupNavLinks(
        preview.map((p) => ({
          title: p.title,
          slug: p.slug,
          isHome: p.isHome,
          showInNav: p.showInNav,
          navLabel: p.navLabel,
        })),
      ),
    [preview],
  );

  function selectTemplate(id: string) {
    setHomeId(id);
    if (!brandingTouched) {
      const suggestion = getTemplateBrandingSuggestion(id);
      setBranding((prev) => ({
        ...prev,
        brandColor: suggestion.brandColor,
        base: suggestion.base,
      }));
      setFontPairId(suggestion.typographyId);
      setFontDisplay(suggestion.fontDisplay);
      setFontBody(suggestion.fontBody);
    }
  }

  function selectTypography(pair: TypographyPair) {
    setFontPairId(pair.id);
    setFontDisplay(pair.display);
    setFontBody(pair.body);
  }

  function updateBranding(next: BrandingDraft) {
    setBrandingTouched(true);
    setBranding(next);
  }

  function togglePage(id: string) {
    setPageIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function runSetup() {
    startTransition(async () => {
      setError(null);
      const res = await setupStudioWebsite({
        homeTemplateId: homeId,
        pageTemplateIds: pageIds,
        tagline: branding.tagline.trim() || null,
        fontDisplay,
        fontBody,
        brandColor: branding.brandColor,
        base: branding.base,
        logoUrl: branding.logoUrl.trim() || null,
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
      {fontsUrl && <link rel="stylesheet" href={fontsUrl} />}

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Set up your website</h1>
          <p className="mt-1 text-sm text-muted">
            Browse 20 starting layouts and 30 type styles. Add your branding, preview, then generate —
            everything stays editable in the visual editor.
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
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-500">
          {error}
        </p>
      )}

      {tab === "preview" ? (
        <section className="overflow-hidden rounded-2xl border border-[--hair] bg-base shadow-sm">
          <div className="flex items-center justify-between border-b border-[--hair] bg-surface px-4 py-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">Homepage preview</p>
            <p className="text-xs text-muted">
              {studioName}
              {branding.tagline ? ` · ${branding.tagline}` : ""}
            </p>
          </div>
          <div className="max-h-[70vh] overflow-y-auto" style={previewVars} data-base={branding.base}>
            <SiteHeader
              studioName={studioName}
              logoUrl={branding.logoUrl || null}
              nav={setupNav}
              portalLabel="Portal"
              preview
            />
            <BlockRenderer blocks={homeBlocks} context={EDITOR_PREVIEW_CONTEXT} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[--hair] bg-surface px-4 py-3">
            <p className="text-xs text-muted">
              {preview.length} page{preview.length === 1 ? "" : "s"} will be created · Homepage publishes on
              generate
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
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
          <div className="space-y-6">
            <BrandingQuickApply studioName={studioName} value={branding} onChange={updateBranding} />

            <section className="space-y-3 rounded-2xl border border-[--hair] bg-surface p-5">
              <div>
                <h2 className="font-semibold text-ink">Homepage template</h2>
                <p className="text-sm text-muted">
                  Scroll through {HOME_TEMPLATES.length} layouts — each is a starting point you can fully edit.
                </p>
              </div>
              <TemplateGallery
                templates={HOME_TEMPLATES}
                selectedId={homeId}
                onSelect={selectTemplate}
                disabled={pending}
              />
            </section>

            <section className="space-y-3 rounded-2xl border border-[--hair] bg-surface p-5">
              <div>
                <h2 className="font-semibold text-ink">Typography</h2>
                <p className="text-sm text-muted">
                  30 curated pairings — tap to preview how your site will read.
                </p>
              </div>
              <TypographyGallery selectedId={fontPairId} onSelect={selectTypography} disabled={pending} />
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

          <div className="space-y-4">
            <section className="sticky top-6 space-y-4 rounded-2xl border border-[--hair] bg-surface p-5">
              <h2 className="font-semibold text-ink">Your site plan</h2>
              <p className="text-sm text-muted">
                Building for <strong className="text-ink">{studioName}</strong> with the{" "}
                <strong className="text-ink">{selectedTemplate?.label ?? "Classic"}</strong> template.
              </p>
              <ul className="space-y-1.5 text-sm text-ink">
                {preview.map((p) => (
                  <li key={p.slug} className="flex items-center justify-between rounded-lg bg-base px-3 py-2">
                    <span>{p.isHome ? "Homepage" : p.title}</span>
                    <span className="text-xs text-muted">/{p.isHome ? "" : p.slug}</span>
                  </li>
                ))}
              </ul>
              <div
                className="overflow-hidden rounded-xl border border-[--hair]"
                style={previewVars}
                data-base={branding.base}
              >
                <div className="border-b border-[--hair] bg-base px-3 py-2 text-xs text-muted">Live mini preview</div>
                <SiteHeader
                  studioName={studioName}
                  logoUrl={branding.logoUrl || null}
                  nav={setupNav}
                  portalLabel="Portal"
                  preview
                />
                <div className="max-h-48 overflow-hidden">
                  <BlockRenderer blocks={homeBlocks.slice(0, 2)} context={EDITOR_PREVIEW_CONTEXT} />
                </div>
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTab("preview")}
                  className="btn-glow w-full px-6 py-2.5 text-sm"
                >
                  Open full preview
                </button>
                <button
                  type="button"
                  onClick={runSetup}
                  disabled={pending}
                  className="btn-glow btn-glow--solid w-full px-6 py-2.5 text-sm disabled:opacity-50"
                >
                  {pending ? "Generating…" : "Generate my website"}
                </button>
                <Link
                  href="/portal/admin/site/domain"
                  className="text-center text-xs text-muted underline hover:text-brand"
                >
                  Connect your own domain →
                </Link>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
