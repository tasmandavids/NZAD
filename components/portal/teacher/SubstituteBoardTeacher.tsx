"use client";

import { useState, useTransition } from "react";
import type { SubRequest } from "@/app/portal/teacher/substitutes/page";
import { claimSubstituteRequest } from "@/app/portal/teacher/substitutes/actions";

const STATUS_STYLE: Record<string, string> = {
  open: "bg-blue-100 text-blue-700",
  filled: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDate(d: string) {
  const dt = new Date(d + "T00:00:00");
  return `${DAY[dt.getDay()]} ${dt.toLocaleDateString("en-NZ", { day: "numeric", month: "short" })}`;
}

export function SubstituteBoardTeacher({ requests: initial }: { requests: SubRequest[] }) {
  const [requests, setRequests] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleClaim(id: string) {
    setError(null);
    startTransition(async () => {
      const res = await claimSubstituteRequest(id);
      if (res?.error) { setError(res.error); return; }
      setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: "filled", isFilledByMe: true } : r));
    });
  }

  const open = requests.filter((r) => r.status === "open");
  const mine = requests.filter((r) => r.isFilledByMe);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-base-content">Substitute board</h1>
        <p className="text-sm text-base-content/60 mt-0.5">Open sub slots from your affiliated studios</p>
      </div>

      {error && <p className="text-sm text-red-500 bg-red-50 rounded p-2">{error}</p>}

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-base-content/50">
          Open ({open.length})
        </h2>
        {open.length === 0 ? (
          <div className="border-2 border-dashed border-base-300 rounded-xl p-10 text-center">
            <p className="text-sm text-base-content/40">No open sub slots right now.</p>
          </div>
        ) : (
          open.map((r) => (
            <div key={r.id} className="bg-surface rounded-xl p-4 shadow-sm flex items-center gap-4">
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-brand">{r.studioName}</span>
                  {r.discipline && (
                    <span className="text-xs bg-base-200 text-base-content/60 rounded-full px-2 py-0.5">{r.discipline}</span>
                  )}
                </div>
                <p className="font-semibold text-base-content">{r.className}</p>
                <p className="text-sm text-base-content/60">
                  {formatDate(r.date)} · {r.startTime}–{r.endTime}
                </p>
                {r.notes && <p className="text-xs text-base-content/50 mt-1">{r.notes}</p>}
              </div>
              <button
                onClick={() => handleClaim(r.id)}
                disabled={pending}
                className="shrink-0 btn-brand px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                I&apos;ll cover it
              </button>
            </div>
          ))
        )}
      </section>

      {mine.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-base-content/50">
            Slots I&apos;m covering
          </h2>
          {mine.map((r) => (
            <div key={r.id} className="bg-surface rounded-xl p-4 shadow-sm flex items-center gap-4 opacity-75">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-brand">{r.studioName}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[r.status]}`}>{r.status}</span>
                </div>
                <p className="font-semibold text-base-content">{r.className}</p>
                <p className="text-sm text-base-content/60">{formatDate(r.date)} · {r.startTime}–{r.endTime}</p>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
