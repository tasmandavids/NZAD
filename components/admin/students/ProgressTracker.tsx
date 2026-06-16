"use client";

// ============================================================================
//  ProgressTracker — log + timeline of a student's progress entries.
//  Add-entry form (note, level, certification badges) + reverse-chronological
//  timeline. Used by both the admin student-detail page and (read-mostly) the
//  teacher portal. Writes go through the shared logProgress server action.
// ============================================================================

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  logProgress,
  deleteProgress,
} from "@/app/portal/admin/students/[id]/actions";

export type ProgressEntry = {
  id: string;
  notes: string | null;
  level: string | null;
  certifications: string[];
  loggedAt: string;
  instructorName: string | null;
};

interface Props {
  studentId: string;
  entries: ProgressEntry[];
  /** Hide the delete control (e.g. teacher view). Defaults to false. */
  readOnlyDelete?: boolean;
}

const LEVELS = [
  "Beginner",
  "Improver",
  "Intermediate",
  "Advanced",
  "Pre-Professional",
];

function formatWhen(iso: string) {
  return new Date(iso).toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ProgressTracker({
  studentId,
  entries,
  readOnlyDelete = false,
}: Props) {
  const [notes, setNotes] = useState("");
  const [level, setLevel] = useState("");
  const [certInput, setCertInput] = useState("");
  const [certs, setCerts] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function addCert() {
    const c = certInput.trim();
    if (c && !certs.includes(c)) setCerts((prev) => [...prev, c]);
    setCertInput("");
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await logProgress({
        studentId,
        notes,
        level,
        certifications: certs,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setNotes("");
      setLevel("");
      setCerts([]);
      setCertInput("");
    });
  }

  function remove(entryId: string) {
    startTransition(async () => {
      await deleteProgress(entryId, studentId);
    });
  }

  return (
    <div className="space-y-8">
      {/* ── Log a new entry ─────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-[--hair] bg-surface p-5">
        <h2 className="mb-4 text-sm font-black text-ink">Log progress</h2>

        <label className="mb-1 block text-[0.68rem] font-semibold uppercase tracking-wider text-muted">
          Instructor notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="What did they work on? How are they tracking?"
          className="mb-4 w-full resize-none rounded-xl border border-[--hair] bg-base px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-[--brand] focus:outline-none"
        />

        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[0.68rem] font-semibold uppercase tracking-wider text-muted">
              Level
            </label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full rounded-xl border border-[--hair] bg-base px-3 py-2 text-sm text-ink focus:border-[--brand] focus:outline-none"
            >
              <option value="">— unchanged —</option>
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[0.68rem] font-semibold uppercase tracking-wider text-muted">
              Award certification
            </label>
            <div className="flex gap-2">
              <input
                value={certInput}
                onChange={(e) => setCertInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCert();
                  }
                }}
                placeholder="e.g. Grade 3 Ballet"
                className="flex-1 rounded-xl border border-[--hair] bg-base px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-[--brand] focus:outline-none"
              />
              <button
                type="button"
                onClick={addCert}
                className="shrink-0 rounded-xl border border-[--hair] px-3 py-2 text-sm text-muted hover:text-ink"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {certs.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {certs.map((c) => (
              <span
                key={c}
                className="inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--brand)_14%,transparent)] px-3 py-1 text-xs font-semibold text-[--brand]"
              >
                🏅 {c}
                <button
                  type="button"
                  onClick={() => setCerts((prev) => prev.filter((x) => x !== c))}
                  className="text-[--brand] hover:opacity-70"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}

        {error && (
          <p className="mb-3 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-500">
            {error}
          </p>
        )}

        <button
          onClick={submit}
          disabled={pending}
          className="rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          style={{ background: "var(--brand)" }}
        >
          {pending ? "Saving…" : "Save entry"}
        </button>
      </section>

      {/* ── Timeline ────────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-xs uppercase tracking-widest text-muted">
          Progress history · {entries.length}
        </h2>

        {entries.length === 0 ? (
          <p className="rounded-2xl border border-[--hair] bg-surface px-6 py-10 text-center text-sm text-muted">
            No progress logged yet. Add the first entry above.
          </p>
        ) : (
          <ol className="relative space-y-5 border-l border-[--hair] pl-6">
            <AnimatePresence initial={false}>
              {entries.map((entry) => (
                <motion.li
                  key={entry.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="relative"
                >
                  <span
                    className="absolute -left-[1.7rem] top-1.5 h-3 w-3 rounded-full border-2 border-surface"
                    style={{ background: "var(--brand)" }}
                  />
                  <div className="rounded-2xl border border-[--hair] bg-surface p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {entry.level && (
                          <span className="rounded-full bg-[color-mix(in_srgb,var(--brand)_14%,transparent)] px-2.5 py-0.5 text-[0.62rem] font-semibold uppercase tracking-wider text-[--brand]">
                            {entry.level}
                          </span>
                        )}
                        <span className="text-xs text-muted">
                          {formatWhen(entry.loggedAt)}
                          {entry.instructorName ? ` · ${entry.instructorName}` : ""}
                        </span>
                      </div>
                      {!readOnlyDelete && (
                        <button
                          onClick={() => remove(entry.id)}
                          disabled={pending}
                          className="shrink-0 text-xs text-muted transition-colors hover:text-red-400"
                        >
                          Delete
                        </button>
                      )}
                    </div>

                    {entry.notes && (
                      <p className="mt-2 whitespace-pre-wrap text-sm text-ink">
                        {entry.notes}
                      </p>
                    )}

                    {entry.certifications.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {entry.certifications.map((c) => (
                          <span
                            key={c}
                            className="inline-flex items-center gap-1 rounded-full border border-[--hair] px-2.5 py-0.5 text-[0.62rem] font-semibold text-ink"
                          >
                            🏅 {c}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ol>
        )}
      </section>
    </div>
  );
}
