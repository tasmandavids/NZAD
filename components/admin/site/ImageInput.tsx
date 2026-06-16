"use client";

// ============================================================================
//  ImageInput — upload-or-paste control for site-builder `image` fields.
//  Uploads bytes straight to Supabase Storage via a server-minted signed URL,
//  then stores the resulting public URL. Pasting a URL by hand still works.
//
//  • Large raster images are downscaled in the browser before upload (caps
//    dimensions + bytes; SVG/GIF pass through untouched).
//  • When an image is replaced or removed, the previous Storage object is
//    deleted (best-effort orphan cleanup).
// ============================================================================

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  createSiteImageUploadUrl,
  deleteSiteImage,
} from "@/app/portal/admin/site/upload-actions";

const BUCKET = "site-images";
const MAX_DIM = 1920; // longest edge after downscale
const DOWNSCALE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/** Downscale a raster image to MAX_DIM on its longest edge. Returns the
 *  original file if it's already small enough, not a raster type, or if
 *  anything goes wrong (best-effort). */
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = () => inputRef.current?.click();

  // Best-effort delete of a previous Storage object (orphan cleanup).
  const cleanup = (url: string) => {
    if (url) void deleteSiteImage(url).catch(() => {});
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
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
      cleanup(previous); // drop the image we just replaced
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
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
            none
          </div>
        )}
        <div className="flex flex-1 flex-col gap-1.5">
          <input
            type="text"
            value={value}
            placeholder="Paste an image URL or upload"
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
              {busy ? "Uploading…" : value ? "Replace" : "Upload"}
            </button>
            {value && !busy && (
              <button
                type="button"
                onClick={remove}
                className="text-xs text-red-500 hover:underline"
              >
                Remove
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
