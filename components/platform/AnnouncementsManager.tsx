"use client";

import { useState, useTransition } from "react";
import type { PlatformAnnouncement, AnnouncementSeverity, AnnouncementTarget } from "@/lib/platform/types";
import { createAnnouncement, publishAnnouncement } from "@/app/platform/announcements/actions";

export function AnnouncementsManager({
  announcements,
}: {
  announcements: PlatformAnnouncement[];
}) {
  const [items, setItems] = useState(announcements);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [severity, setSeverity] = useState<AnnouncementSeverity>("info");
  const [target, setTarget] = useState<AnnouncementTarget>("all");
  const [pending, startTransition] = useTransition();

  function create() {
    if (!title.trim() || !body.trim()) return;
    startTransition(async () => {
      const res = await createAnnouncement({ title, body, severity, target });
      if (res.ok && res.announcement) {
        setItems((prev) => [res.announcement!, ...prev]);
        setTitle("");
        setBody("");
      }
    });
  }

  function publish(id: string) {
    startTransition(async () => {
      const res = await publishAnnouncement(id);
      if (res.ok) {
        setItems((prev) =>
          prev.map((a) =>
            a.id === id ? { ...a, publishedAt: new Date().toISOString() } : a,
          ),
        );
      }
    });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-black text-ink">Announcements</h1>
        <p className="text-sm text-muted">
          Broadcast updates to studio admins — maintenance, new features, policy changes.
        </p>
      </header>

      <div className="rounded-2xl border border-[--hair] bg-surface p-5 space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="w-full rounded-xl border border-[--hair] bg-base px-3 py-2 text-sm"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Message body (shown in studio admin portal)…"
          className="w-full rounded-xl border border-[--hair] bg-base px-3 py-2 text-sm"
        />
        <div className="flex flex-wrap gap-3">
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as AnnouncementSeverity)}
            className="rounded-xl border border-[--hair] bg-base px-3 py-2 text-sm"
          >
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value as AnnouncementTarget)}
            className="rounded-xl border border-[--hair] bg-base px-3 py-2 text-sm"
          >
            <option value="all">All studios</option>
            <option value="trial">Trial only</option>
            <option value="active">Active only</option>
            <option value="suspended">Suspended only</option>
          </select>
          <button
            onClick={create}
            disabled={pending}
            className="rounded-full bg-brand px-5 py-2 text-xs font-bold uppercase text-white"
          >
            Draft announcement
          </button>
        </div>
      </div>

      <ul className="space-y-3">
        {items.map((a) => (
          <li key={a.id} className="rounded-2xl border border-[--hair] bg-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-bold text-ink">{a.title}</p>
                <p className="mt-1 text-sm text-muted whitespace-pre-wrap">{a.body}</p>
                <p className="mt-2 text-xs text-muted">
                  {a.severity} · {a.target}
                  {a.publishedAt
                    ? ` · published ${new Date(a.publishedAt).toLocaleString("en-NZ")}`
                    : " · draft"}
                </p>
              </div>
              {!a.publishedAt && (
                <button
                  onClick={() => publish(a.id)}
                  disabled={pending}
                  className="rounded-full border border-[--hair] px-4 py-1.5 text-xs font-bold uppercase hover:border-brand"
                >
                  Publish now
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
