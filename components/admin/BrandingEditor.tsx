"use client";

// ============================================================================
//  BrandingEditor — the Admin → Appearance screen.
//  Left: the form. Right: a live preview that reskins as you edit (the SAME
//  brandingToCssVars used by the real SSR layout, scoped to a wrapper div so
//  it doesn't repaint the admin chrome). Save calls the server action and the
//  layout revalidates, so the studio's public site updates everywhere.
// ============================================================================

import { useMemo, useState, useTransition } from "react";
import type { CSSProperties } from "react";
import type { Branding, ThemeBase } from "@/lib/types";
import { brandingToCssVars } from "@/lib/branding";
import { saveBranding } from "@/app/portal/admin/branding/actions";

import { TYPOGRAPHY_PAIRS } from "@/lib/site/typography";

const PRESETS: { label: string; brandColor: string; base: ThemeBase }[] = [
  { label: "Iris", brandColor: "#6B66C9", base: "light" },
  { label: "Crimson", brandColor: "#C8102E", base: "light" },
  { label: "Voltage", brandColor: "#5B5BFF", base: "light" },
  { label: "Aurum", brandColor: "#C9A227", base: "light" },
  { label: "Bloom", brandColor: "#E84A8A", base: "light" },
  { label: "Jade", brandColor: "#13B6A4", base: "light" },
];

const FONT_OPTIONS = [...new Set(TYPOGRAPHY_PAIRS.flatMap((p) => [p.display, p.body]))].sort();

export function BrandingEditor({ initial }: { initial: Branding }) {
  const [b, setB] = useState<Branding>(initial);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);

  const set = <K extends keyof Branding>(key: K, value: Branding[K]) =>
    setB((prev) => ({ ...prev, [key]: value }));

  // Tokens for the preview pane only.
  const previewVars = useMemo(() => brandingToCssVars(b) as CSSProperties, [b]);

  const onSave = () =>
    startTransition(async () => {
      const res = await saveBranding({
        tagline: b.tagline,
        logoUrl: b.logoUrl,
        brandColor: b.brandColor,
        base: b.base,
        fontDisplay: b.fontDisplay,
        fontBody: b.fontBody,
        siteSettings: b.siteSettings,
      });
      setStatus(res.ok ? "Saved" : res.error);
      setTimeout(() => setStatus(null), 2500);
    });

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)]">
      {/* ----------------------------- FORM ----------------------------- */}
      <div className="space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Appearance</h1>
            <p className="text-sm text-muted">How your public site and portals look to families.</p>
          </div>
          <button
            onClick={onSave}
            disabled={pending}
            className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save changes"}
          </button>
        </header>

        {/* Identity */}
        <section className="space-y-3">
          <h2 className="text-xs uppercase tracking-widest text-muted">Identity</h2>
          <label className="block text-sm">
            <span className="mb-1 block text-muted">Tagline</span>
            <input
              type="text"
              value={b.tagline ?? ""}
              onChange={(e) => set("tagline", e.target.value || null)}
              placeholder="Ōtautahi · Canterbury"
              className="w-full rounded-lg border border-[--hair] bg-base/40 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-muted">Logo URL</span>
            <input
              type="url"
              value={b.logoUrl ?? ""}
              onChange={(e) => set("logoUrl", e.target.value || null)}
              placeholder="https://…/logo.svg"
              className="w-full rounded-lg border border-[--hair] bg-base/40 px-3 py-2"
            />
          </label>
        </section>

        {/* Brand colour */}
        <section className="space-y-3">
          <h2 className="text-xs uppercase tracking-widest text-muted">Brand colour</h2>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={b.brandColor}
              onChange={(e) => set("brandColor", e.target.value)}
              className="h-10 w-12 cursor-pointer rounded-lg border border-[--hair] bg-transparent p-0.5"
              aria-label="Brand colour"
            />
            <code className="text-sm text-muted">{b.brandColor.toUpperCase()}</code>
            <div className="ml-auto flex gap-1.5">
              {previewSwatches(b.brandColor).map((c) => (
                <span key={c} className="h-6 w-6 rounded" style={{ background: c }} />
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => setB((prev) => ({ ...prev, brandColor: p.brandColor, base: p.base }))}
                className="flex items-center gap-2 rounded-full border border-[--hair] px-3 py-1.5 text-xs"
              >
                <span className="h-3 w-3 rounded-full" style={{ background: p.brandColor }} />
                {p.label}
              </button>
            ))}
          </div>
        </section>

        {/* Base + typography */}
        <section className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <h2 className="text-xs uppercase tracking-widest text-muted">Base</h2>
            <div className="inline-flex rounded-full border border-[--hair] p-1">
              {(["dark", "light"] as ThemeBase[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => set("base", mode)}
                  className={`rounded-full px-4 py-1.5 text-sm capitalize ${
                    b.base === mode ? "bg-brand text-white" : "text-muted"
                  }`}
                >
                  {mode === "dark" ? "Dark stage" : "Light studio"}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-xs uppercase tracking-widest text-muted">Display font</h2>
            <select
              value={b.fontDisplay}
              onChange={(e) => set("fontDisplay", e.target.value)}
              className="w-full rounded-lg border border-[--hair] bg-base/40 px-3 py-2 text-sm"
            >
              {FONT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <h2 className="text-xs uppercase tracking-widest text-muted">Body font</h2>
            <select
              value={b.fontBody}
              onChange={(e) => set("fontBody", e.target.value)}
              className="w-full rounded-lg border border-[--hair] bg-base/40 px-3 py-2 text-sm"
            >
              {FONT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </section>

        {/* Website chrome (footer / portal) */}
        <section className="space-y-3">
          <h2 className="text-xs uppercase tracking-widest text-muted">Website chrome</h2>
          <label className="block text-sm">
            <span className="mb-1 block text-muted">Footer tagline</span>
            <textarea
              rows={2}
              value={b.siteSettings.footerTagline ?? ""}
              onChange={(e) =>
                setB((prev) => ({
                  ...prev,
                  siteSettings: { ...prev.siteSettings, footerTagline: e.target.value || undefined },
                }))
              }
              className="w-full rounded-lg border border-[--hair] bg-base/40 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-muted">Portal button label</span>
            <input
              value={b.siteSettings.portalLabel ?? "Portal"}
              onChange={(e) =>
                setB((prev) => ({
                  ...prev,
                  siteSettings: { ...prev.siteSettings, portalLabel: e.target.value },
                }))
              }
              className="w-full rounded-lg border border-[--hair] bg-base/40 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-muted">Contact email</span>
            <input
              type="email"
              value={b.siteSettings.contactEmail ?? ""}
              onChange={(e) =>
                setB((prev) => ({
                  ...prev,
                  siteSettings: { ...prev.siteSettings, contactEmail: e.target.value || undefined },
                }))
              }
              className="w-full rounded-lg border border-[--hair] bg-base/40 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-muted">Contact phone</span>
            <input
              value={b.siteSettings.contactPhone ?? ""}
              onChange={(e) =>
                setB((prev) => ({
                  ...prev,
                  siteSettings: { ...prev.siteSettings, contactPhone: e.target.value || undefined },
                }))
              }
              className="w-full rounded-lg border border-[--hair] bg-base/40 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-muted">Region label (footer)</span>
            <input
              value={b.siteSettings.regionLabel ?? ""}
              onChange={(e) =>
                setB((prev) => ({
                  ...prev,
                  siteSettings: { ...prev.siteSettings, regionLabel: e.target.value || undefined },
                }))
              }
              placeholder="Aotearoa, New Zealand"
              className="w-full rounded-lg border border-[--hair] bg-base/40 px-3 py-2"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={b.siteSettings.showPoweredBy !== false}
              onChange={(e) =>
                setB((prev) => ({
                  ...prev,
                  siteSettings: { ...prev.siteSettings, showPoweredBy: e.target.checked },
                }))
              }
              className="h-4 w-4 accent-[--brand]"
            />
            <span className="text-ink">Show &quot;Powered by Olune&quot; in footer</span>
          </label>
        </section>

        {status && (
          <p className={`text-sm ${status === "Saved" ? "text-brand-hot" : "text-red-400"}`}>
            {status === "Saved" ? "Branding saved — your site is live." : status}
          </p>
        )}
      </div>

      {/* --------------------------- LIVE PREVIEW --------------------------- */}
      {/* Tenant tokens scoped here only, so the admin chrome stays put. */}
      <div className="lg:sticky lg:top-6">
        <p className="mb-2 text-xs uppercase tracking-widest text-muted">Live preview · your public site</p>
        <div
          style={previewVars}
          data-base={b.base}
          className="overflow-hidden rounded-2xl border border-[--hair]"
        >
          <div style={{ background: "var(--base)", color: "var(--text)" }} className="p-7">
            <div className="mb-6 flex items-center gap-2">
              <span
                style={{ borderColor: "var(--brand)", color: "var(--text)" }}
                className="grid h-8 w-8 place-items-center border text-sm font-black"
              >
                {(b.tagline?.trim()?.[0] ?? "S").toUpperCase()}
              </span>
              <span style={{ color: "var(--muted)" }} className="text-[0.6rem] uppercase tracking-[0.3em]">
                {b.tagline ?? "Your studio"}
              </span>
            </div>
            <h3 style={{ color: "var(--text)" }} className="text-3xl font-black uppercase leading-none">
              Where movement<br />becomes{" "}
              <em style={{ color: "var(--brand-hot)", fontFamily: "Cormorant Garamond, serif" }} className="not-italic font-semibold italic">
                art.
              </em>
            </h3>
            <div className="mt-5 flex gap-2">
              <span style={{ background: "var(--brand)", color: "#fff" }} className="rounded-full px-4 py-2 text-xs font-bold uppercase">
                Book a trial
              </span>
              <span style={{ borderColor: "var(--hair)", color: "var(--text)" }} className="rounded-full border px-4 py-2 text-xs font-bold uppercase">
                Programmes
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// mini palette preview (mirrors derivePalette without importing for clarity)
function previewSwatches(hex: string): string[] {
  // brand / hot / deep — uses CSS color-mix so we don't duplicate the HSL maths
  return [
    hex,
    `color-mix(in srgb, ${hex} 78%, white)`,
    `color-mix(in srgb, ${hex} 70%, black)`,
  ];
}
