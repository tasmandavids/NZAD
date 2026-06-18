"use client";

import ImageInput from "@/components/admin/site/ImageInput";
import VideoInput from "@/components/admin/site/VideoInput";
import {
  BACKGROUND_KIND_OPTIONS,
  type BackgroundKind,
  type PageBackground,
} from "@/lib/site/background";

export function BackgroundEditor({
  background,
  onChange,
}: {
  background: PageBackground;
  onChange: (bg: PageBackground) => void;
}) {
  const set = <K extends keyof PageBackground>(key: K, value: PageBackground[K]) =>
    onChange({ ...background, [key]: value });

  return (
    <div className="space-y-4 p-4">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">Page background</h2>
        <p className="mt-1 text-xs text-muted">The canvas behind all your elements. Drag blocks on top of it freely.</p>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-ink">Background type</span>
        <select
          value={background.kind}
          onChange={(e) => set("kind", e.target.value as BackgroundKind)}
          className="field-premium"
        >
          {BACKGROUND_KIND_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </label>

      {background.kind === "image" && (
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-ink">Background image</span>
          <ImageInput value={background.imageUrl ?? ""} onChange={(url) => set("imageUrl", url)} />
        </label>
      )}

      {background.kind === "video" && (
        <>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink">Background video</span>
            <VideoInput value={background.videoUrl ?? ""} onChange={(url) => set("videoUrl", url)} />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={background.videoAutoplay ?? false}
              onChange={(e) => set("videoAutoplay", e.target.checked)}
              className="h-4 w-4 accent-[--brand]"
            />
            <span className="text-ink">Autoplay (muted)</span>
          </label>
        </>
      )}

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-ink">Opacity (%)</span>
        <input
          type="number"
          min={0}
          max={100}
          value={background.opacity ?? 100}
          onChange={(e) => set("opacity", e.target.value === "" ? 100 : Number(e.target.value))}
          className="field-premium"
        />
      </label>
    </div>
  );
}
