"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import {
  createSiteImageUploadUrl,
  deleteSiteImage,
} from "@/app/portal/admin/site/upload-actions";

const BUCKET = "site-images";
const MAX_DIM = 1920;
const DOWNSCALE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

async function maybeDownscale(file: File): Promise<Blob> {
  if (!DOWNSCALE_TYPES.has(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    if (Math.max(width, height) <= MAX_DIM) {
      bitmap.close();
      return file;
    }
    const scale = MAX_DIM / Math.max(width, height);
    const w = Math.round(width * scale);
    const h = Math.round(height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, file.type, 0.85),
    );
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

export default function ImageInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const t = useTranslations("site.media");
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = () => inputRef.current?.click();

  const cleanup = (url: string) => {
    if (url) void deleteSiteImage(url).catch(() => {});
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    setBusy(true);
    const previous = value;
    try {
      const upload = await maybeDownscale(file);
      const ticket = await createSiteImageUploadUrl(file.type, upload.size);
      if (!ticket.ok) {
        setError(ticket.error);
        return;
      }
      const supabase = createClient();
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .uploadToSignedUrl(ticket.data.path, ticket.data.token, upload, {
          contentType: file.type,
        });
      if (upErr) {
        setError(upErr.message);
        return;
      }
      onChange(ticket.data.publicUrl);
      cleanup(previous);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("uploadFailed"));
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    const previous = value;
    onChange("");
    cleanup(previous);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt=""
            className="h-12 w-12 shrink-0 rounded-md border border-[--hair] object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-dashed border-[--hair] text-[0.6rem] text-muted">
            {t("none")}
          </div>
        )}
        <div className="flex flex-1 flex-col gap-1.5">
          <input
            type="text"
            value={value}
            placeholder={t("imagePlaceholder")}
            onChange={(e) => onChange(e.target.value)}
            className="field-premium"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={pick}
              disabled={busy}
              className="rounded-full border border-[--hair] px-3 py-1 text-xs font-medium text-ink transition hover:bg-base disabled:opacity-50"
            >
              {busy ? t("uploading") : value ? t("replace") : t("upload")}
            </button>
            {value && !busy && (
              <button
                type="button"
                onClick={remove}
                className="text-xs text-red-500 hover:underline"
              >
                {t("remove")}
              </button>
            )}
          </div>
        </div>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/avif"
        onChange={onFile}
        className="hidden"
      />
    </div>
  );
}
