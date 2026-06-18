"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { SiteEvent } from "@/lib/site/queries";

const CATEGORY_LABELS: Record<string, string> = {
  all: "All",
  news: "News",
  events: "Events",
  term_dates: "Term dates",
  productions: "Productions",
  announcements: "Announcements",
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-NZ", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function NewsFeedBlock({
  events,
  eyebrow,
  heading,
  subheading,
  showFilters,
  viewAllLabel,
  viewAllHref,
}: {
  events: SiteEvent[];
  eyebrow: string;
  heading: string;
  subheading: string;
  showFilters: boolean;
  viewAllLabel: string;
  viewAllHref: string;
}) {
  const categories = useMemo(() => {
    const cats = new Set(events.map((e) => e.category || "events"));
    return ["all", ...[...cats].sort()];
  }, [events]);

  const [filter, setFilter] = useState("all");

  const shown =
    filter === "all" ? events : events.filter((e) => (e.category || "events") === filter);

  return (
    <div className="mx-auto w-full max-w-5xl">
      {eyebrow && (
        <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.25em] text-brand-hot">
          {eyebrow}
        </p>
      )}
      <h2 className="text-center text-3xl font-bold text-ink" style={{ fontFamily: "var(--font-display)" }}>
        {heading}
      </h2>
      {subheading && <p className="mt-2 text-center text-muted">{subheading}</p>}

      {showFilters && categories.length > 1 && (
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilter(cat)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition ${
                filter === cat ? "bg-ink text-base" : "border border-[--hair] text-muted hover:text-ink"
              }`}
            >
              {CATEGORY_LABELS[cat] ?? cat}
            </button>
          ))}
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {shown.length === 0 ? (
          <p className="col-span-full text-center text-muted">No items to show yet.</p>
        ) : (
          shown.map((e) => (
            <article key={e.id} className="rounded-2xl border border-[--hair] bg-surface p-5">
              <time className="text-xs font-semibold uppercase tracking-wider text-brand">
                {formatDate(e.eventDate)}
              </time>
              <h3 className="mt-2 text-lg font-semibold text-ink">{e.name}</h3>
              {e.description && (
                <p className="mt-2 line-clamp-3 text-sm text-muted">{e.description}</p>
              )}
            </article>
          ))
        )}
      </div>

      {viewAllLabel && viewAllHref && (
        <div className="mt-8 text-center">
          <Link
            href={viewAllHref}
            className="text-sm font-semibold uppercase tracking-wider text-brand hover:underline"
          >
            {viewAllLabel} →
          </Link>
        </div>
      )}
    </div>
  );
}
