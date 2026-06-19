"use client";

import type { ThemeBase } from "@/lib/types";
import { OptimizableImage } from "@/components/ui/OptimizableImage";

const COLOR_PRESETS = [
  { label: "Iris", color: "#6B66C9" },
  { label: "Crimson", color: "#C8102E" },
  { label: "Voltage", color: "#5B5BFF" },
  { label: "Aurum", color: "#C9A227" },
  { label: "Bloom", color: "#E84A8A" },
  { label: "Jade", color: "#13B6A4" },
  { label: "Forest", color: "#22C55E" },
  { label: "Slate", color: "#2D3748" },
];

export type BrandingDraft = {
  brandColor: string;
  base: ThemeBase;
  logoUrl: string;
  tagline: string;
};

type Props = {
  studioName: string;
  value: BrandingDraft;
  onChange: (next: BrandingDraft) => void;
};

export function BrandingQuickApply({ studioName, value, onChange }: Props) {
  const set = <K extends keyof BrandingDraft>(key: K, val: BrandingDraft[K]) =>
    onChange({ ...value, [key]: val });

  return (
    <section className="space-y-4 rounded-2xl border border-brand/20 bg-brand/5 p-5">
      <div>
        <h2 className="font-semibold text-ink">Your branding</h2>
        <p className="mt-0.5 text-sm text-muted">
          Drop in your logo and colours — they apply instantly to the preview below.
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex shrink-0 items-center gap-3">
          <div
            className="grid h-16 w-16 place-items-center overflow-hidden rounded-xl border border-[--hair] bg-surface text-xl font-bold"
            style={{ color: value.brandColor }}
          >
            {value.logoUrl ? (
              <OptimizableImage
                src={value.logoUrl}
                alt=""
                width={64}
                height={64}
                className="h-full w-full object-contain p-1"
              />
            ) : (
              studioName.charAt(0).toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">{studioName}</p>
            <p className="truncate text-xs text-muted">{value.tagline || "Your tagline"}</p>
          </div>
        </div>

        <div className="grid flex-1 gap-3 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-ink">Logo URL</span>
            <input
              type="url"
              value={value.logoUrl}
              onChange={(e) => set("logoUrl", e.target.value)}
              placeholder="https://…/logo.png"
              className="field-premium"
            />
          </label>

          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-ink">Tagline</span>
            <input
              value={value.tagline}
              onChange={(e) => set("tagline", e.target.value)}
              placeholder="e.g. Auckland · All ages welcome"
              className="field-premium"
            />
          </label>

          <div className="space-y-2">
            <span className="block text-sm font-medium text-ink">Brand colour</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={value.brandColor}
                onChange={(e) => set("brandColor", e.target.value)}
                className="h-10 w-12 cursor-pointer rounded-lg border border-[--hair] bg-transparent p-0.5"
                aria-label="Brand colour"
              />
              <code className="text-xs text-muted">{value.brandColor.toUpperCase()}</code>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {COLOR_PRESETS.map((p) => (
                <button
                  key={p.color}
                  type="button"
                  title={p.label}
                  onClick={() => set("brandColor", p.color)}
                  className={`h-7 w-7 rounded-full border-2 transition ${
                    value.brandColor === p.color ? "border-ink scale-110" : "border-transparent"
                  }`}
                  style={{ background: p.color }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <span className="block text-sm font-medium text-ink">Site theme</span>
            <div className="inline-flex rounded-full border border-[--hair] bg-base p-1">
              {(["light", "dark"] as ThemeBase[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => set("base", mode)}
                  className={`rounded-full px-4 py-1.5 text-sm capitalize transition ${
                    value.base === mode ? "bg-brand text-white" : "text-muted hover:text-ink"
                  }`}
                >
                  {mode === "dark" ? "Dark" : "Light"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
