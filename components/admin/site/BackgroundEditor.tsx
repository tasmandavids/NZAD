"use client";

import { useTranslations } from "next-intl";
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
  const t = useTranslations("site.background");
  const set = <K extends keyof PageBackground>(key: K, value: PageBackground[K]) =>
    onChange({ ...background, [key]: value });

  return (
    <div className="space-y-4 p-4">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">{t("title")}</h2>
        <p className="mt-1 text-xs text-muted">{t("subtitle")}</p>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-ink">{t("type")}</span>
        <select
          value={background.kind}
          onChange={(e) => set("kind", e.target.value as BackgroundKind)}
          className="field-premium"
        >
          {BACKGROUND_KIND_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {t(`kinds.${opt.value}`)}
            </option>
          ))}
        </select>
      </label>

      {background.kind === "image" && (
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-ink">{t("image")}</span>
          <ImageInput value={background.imageUrl ?? ""} onChange={(url) => set("imageUrl", url)} />
        </label>
      )}

      {background.kind === "video" && (
        <>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink">{t("video")}</span>
            <VideoInput value={background.videoUrl ?? ""} onChange={(url) => set("videoUrl", url)} />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={background.videoAutoplay ?? false}
              onChange={(e) => set("videoAutoplay", e.target.checked)}
              className="h-4 w-4 accent-[--brand]"
            />
            <span className="text-ink">{t("autoplayMuted")}</span>
          </label>
        </>
      )}

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-ink">{t("opacity")}</span>
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
