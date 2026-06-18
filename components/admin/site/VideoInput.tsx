"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  createSiteVideoUploadUrl,
  deleteSiteImage,
} from "@/app/portal/admin/site/upload-actions";

const BUCKET = "site-images";

export default function VideoInput({
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
      const ticket = await createSiteVideoUploadUrl(file.type, file.size);
      if (!ticket.ok) {
        setError(ticket.error);
        return;
      }
      const supabase = createClient();
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .uploadToSignedUrl(ticket.data.path, ticket.data.token, file, {
          contentType: file.type,
        });
      if (upErr) {
        setError(upErr.message);
        return;
      }
      onChange(ticket.data.publicUrl);
      cleanup(previous);
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
      <div className="flex flex-col gap-1.5">
        <input
          type="text"
          value={value}
          placeholder="Paste a video URL or upload MP4 / WebM"
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
            {busy ? "Uploading…" : value ? "Replace video" : "Upload video"}
          </button>
          {value && !busy && (
            <button type="button" onClick={remove} className="text-xs text-red-500 hover:underline">
              Remove
            </button>
          )}
        </div>
      </div>
      {value && (
        <video src={value} controls muted playsInline className="max-h-32 w-full rounded-lg border border-[--hair] bg-black/5" />
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        onChange={onFile}
        className="hidden"
      />
    </div>
  );
}
