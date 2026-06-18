"use client";

import { useMemo, useState } from "react";
import { formatMoney } from "@/lib/currency";
import type { SiteClass } from "@/lib/site/queries";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatTime(t: string | null): string {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "pm" : "am";
  const h12 = hour % 12 || 12;
  return `${h12}:${m}${ampm}`;
}

export function ScheduleBlock({
  classes,
  eyebrow,
  heading,
  subheading,
  footnote,
}: {
  classes: SiteClass[];
  eyebrow: string;
  heading: string;
  subheading: string;
  footnote: string;
}) {
  const days = useMemo(() => {
    const set = new Set<number>();
    for (const c of classes) {
      if (c.dayOfWeek !== null) set.add(c.dayOfWeek);
    }
    return [...set].sort((a, b) => a - b);
  }, [classes]);

  const rooms = useMemo(() => {
    const set = new Set<string>();
    for (const c of classes) {
      if (c.room) set.add(c.room);
    }
    return ["All Studios", ...[...set].sort()];
  }, [classes]);

  const [day, setDay] = useState(days[0] ?? 1);
  const [room, setRoom] = useState("All Studios");

  const filtered = classes.filter((c) => {
    if (c.dayOfWeek !== day) return false;
    if (room !== "All Studios" && c.room !== room) return false;
    return true;
  });

  return (
    <div className="mx-auto w-full max-w-6xl">
      {eyebrow && (
        <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.25em] text-brand-hot">
          {eyebrow}
        </p>
      )}
      <h2 className="text-center text-3xl font-bold text-ink sm:text-4xl" style={{ fontFamily: "var(--font-display)" }}>
        {heading}
      </h2>
      {subheading && <p className="mt-2 text-center text-muted">{subheading}</p>}

      <div className="mt-8 flex flex-wrap justify-center gap-2">
        {days.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDay(d)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition ${
              day === d ? "bg-ink text-base" : "border border-[--hair] text-muted hover:text-ink"
            }`}
          >
            {DAY_NAMES[d]}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {rooms.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRoom(r)}
            className={`rounded-full px-3 py-1 text-xs transition ${
              room === r ? "bg-brand text-white" : "text-muted hover:text-ink"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.length === 0 ? (
          <p className="col-span-full text-center text-muted">No classes scheduled for this day.</p>
        ) : (
          filtered.map((c) => (
            <div key={c.id} className="rounded-xl border border-[--hair] bg-surface p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand">
                {formatTime(c.startTime)}
                {c.endTime ? ` – ${formatTime(c.endTime)}` : ""}
              </p>
              <h3 className="mt-1 font-semibold text-ink">{c.name}</h3>
              <p className="mt-1 text-sm text-muted">
                {[c.room, c.stream, c.level].filter(Boolean).join(" · ")}
              </p>
            </div>
          ))
        )}
      </div>

      {footnote && <p className="mt-8 text-center text-xs text-muted">{footnote}</p>}
    </div>
  );
}

export function ClassTabsBlock({
  classes,
  eyebrow,
  heading,
  subheading,
}: {
  classes: SiteClass[];
  eyebrow: string;
  heading: string;
  subheading: string;
}) {
  const streams = useMemo(() => {
    const map = new Map<string, SiteClass[]>();
    for (const c of classes) {
      const key = c.stream || c.level || "All";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return [...map.entries()];
  }, [classes]);

  const [active, setActive] = useState(streams[0]?.[0] ?? "");
  const activeClasses = streams.find(([s]) => s === active)?.[1] ?? [];

  return (
    <div className="mx-auto w-full max-w-5xl">
      {eyebrow && (
        <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.25em] text-brand-hot">
          {eyebrow}
        </p>
      )}
      <h2 className="text-center text-3xl font-bold text-ink sm:text-4xl" style={{ fontFamily: "var(--font-display)" }}>
        {heading}
      </h2>
      {subheading && (
        <p className="mx-auto mt-3 max-w-2xl text-center text-muted">{subheading}</p>
      )}

      <div className="mt-8 flex flex-wrap justify-center gap-2">
        {streams.map(([stream]) => (
          <button
            key={stream}
            type="button"
            onClick={() => setActive(stream)}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
              active === stream ? "bg-ink text-base" : "border border-[--hair] text-muted hover:text-ink"
            }`}
          >
            {stream}
          </button>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-[--hair] bg-surface p-6 sm:p-8">
        {activeClasses.length === 0 ? (
          <p className="text-center text-muted">Classes coming soon for this stream.</p>
        ) : (
          <div className="space-y-6">
            {activeClasses.map((c) => (
              <div key={c.id} className="border-b border-[--hair] pb-6 last:border-0 last:pb-0">
                <h3 className="text-xl font-semibold text-ink">{c.name}</h3>
                <p className="mt-1 text-sm text-muted">
                  {[c.discipline, c.level].filter(Boolean).join(" · ")}
                </p>
                {c.priceCents > 0 && (
                  <p className="mt-2 text-sm font-semibold text-brand">
                    From {formatMoney(c.priceCents)} / term
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
