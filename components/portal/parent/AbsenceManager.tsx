"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type AbsenceChild = {
  studentId: string;
  name: string | null;
  classes: { id: string; name: string; dayOfWeek: number; startTime: string | null }[];
};

export type Absence = {
  id: string;
  studentName: string | null;
  className: string;
  absenceDate: string;
  reason: string;
  makeupStatus: string;
  makeupDate: string | null;
};

export type MakeupCredit = {
  studentName: string | null;
  credits: number;
  used: number;
  expiresAt: string | null;
};

const REASONS = [
  { value: "sick", label: "Sick / unwell" },
  { value: "holiday", label: "Holiday / travel" },
  { value: "other", label: "Other" },
];

const MAKEUP_STATUS_LABELS: Record<string, string> = {
  not_requested: "No makeup requested",
  requested: "Makeup requested",
  approved: "Makeup approved",
  booked: "Makeup booked",
  completed: "Completed",
  cancelled: "Cancelled",
};

const MAKEUP_STATUS_COLORS: Record<string, string> = {
  not_requested: "var(--muted)",
  requested: "var(--brand-hot)",
  approved: "#22c55e",
  booked: "var(--brand)",
  completed: "#22c55e",
  cancelled: "var(--muted)",
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function fmt12(time: string | null) {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const period = h < 12 ? "am" : "pm";
  const hour = h % 12 || 12;
  return m === 0 ? `${hour}${period}` : `${hour}:${String(m).padStart(2, "0")}${period}`;
}

export function AbsenceManager({
  dancers,
  absences,
  makeupCredits,
  onReport,
  onRequestMakeup,
}: {
  dancers: AbsenceChild[];
  absences: Absence[];
  makeupCredits: MakeupCredit[];
  onReport: (data: {
    studentId: string;
    classId: string;
    absenceDate: string;
    reason: string;
    notes: string;
    requestMakeup: boolean;
  }) => Promise<void>;
  onRequestMakeup: (absenceId: string) => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [selectedChild, setSelectedChild] = useState(dancers[0]?.studentId ?? "");
  const [selectedClass, setSelectedClass] = useState("");
  const [absenceDate, setAbsenceDate] = useState("");
  const [reason, setReason] = useState("sick");
  const [notes, setNotes] = useState("");
  const [requestMakeup, setRequestMakeup] = useState(false);
  const [isPending, startTransition] = useTransition();

  const child = dancers.find((c) => c.studentId === selectedChild);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClass || !absenceDate) return;
    startTransition(async () => {
      await onReport({ studentId: selectedChild, classId: selectedClass, absenceDate, reason, notes, requestMakeup });
      setShowForm(false);
      setNotes("");
      setRequestMakeup(false);
    });
  }

  const totalCredits = makeupCredits.reduce((s, c) => s + c.credits - c.used, 0);

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-ink">Absences & Make-ups</h1>
          <p className="text-sm text-muted">Report missed classes and track your makeup credits.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
        >
          Report absence
        </button>
      </div>

      {/* Makeup credits */}
      {makeupCredits.length > 0 && (
        <div className="rounded-2xl border border-[--hair] bg-surface p-5">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">
            Makeup credits
          </h2>
          <div className="flex flex-wrap gap-3">
            {makeupCredits.map((mc, i) => (
              <div
                key={i}
                className="rounded-xl border border-[--hair] px-4 py-3 text-center"
              >
                <p className="text-2xl font-black text-ink">{mc.credits - mc.used}</p>
                <p className="text-xs text-muted">{mc.studentName ?? "Dancer"}</p>
                {mc.expiresAt && (
                  <p className="mt-0.5 text-[0.6rem] text-muted">
                    expires {new Date(mc.expiresAt).toLocaleDateString("en-NZ", { day: "numeric", month: "short" })}
                  </p>
                )}
              </div>
            ))}
            {totalCredits > 0 && (
              <div className="flex items-center text-sm text-muted">
                <span className="font-semibold text-ink">{totalCredits}</span>&nbsp;credit{totalCredits !== 1 ? "s" : ""} available — contact the studio to book a makeup class.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Absence list */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">
          Reported absences
        </h2>
        {absences.length === 0 ? (
          <div className="rounded-2xl border border-[--hair] bg-surface px-6 py-10 text-center text-sm text-muted">
            No absences reported yet.
          </div>
        ) : (
          <div className="space-y-2">
            {absences.map((a) => (
              <div
                key={a.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-[--hair] bg-surface px-5 py-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{a.className}</p>
                  <p className="text-xs text-muted">
                    {a.studentName} · {new Date(a.absenceDate).toLocaleDateString("en-NZ", { weekday: "long", day: "numeric", month: "short" })} · {a.reason}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.62rem] font-semibold text-white"
                    style={{ background: MAKEUP_STATUS_COLORS[a.makeupStatus] ?? "var(--muted)" }}
                  >
                    {MAKEUP_STATUS_LABELS[a.makeupStatus] ?? a.makeupStatus}
                  </span>
                  {a.makeupStatus === "not_requested" && (
                    <button
                      type="button"
                      onClick={() => startTransition(() => onRequestMakeup(a.id))}
                      className="rounded-lg border border-[--brand] px-3 py-1 text-xs font-bold text-[--brand] transition hover:bg-[color-mix(in_srgb,var(--brand)_10%,transparent)]"
                    >
                      Request makeup
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Report form modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={(e) => e.target === e.currentTarget && setShowForm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-2xl bg-canvas p-6 shadow-2xl"
            >
              <h2 className="mb-4 text-lg font-black text-ink">Report an absence</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                {dancers.length > 1 && (
                  <div>
                    <label className="block text-xs font-semibold text-muted mb-1">Dancer</label>
                    <select
                      value={selectedChild}
                      onChange={(e) => { setSelectedChild(e.target.value); setSelectedClass(""); }}
                      className="w-full rounded-xl border border-[--hair] bg-surface px-3 py-2 text-sm text-ink"
                    >
                      {dancers.map((c) => (
                        <option key={c.studentId} value={c.studentId}>{c.name ?? "Unnamed"}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Class</label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    required
                    className="w-full rounded-xl border border-[--hair] bg-surface px-3 py-2 text-sm text-ink"
                  >
                    <option value="">Select a class…</option>
                    {(child?.classes ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} — {DAY_NAMES[c.dayOfWeek]} {fmt12(c.startTime)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Date of absence</label>
                  <input
                    type="date"
                    value={absenceDate}
                    onChange={(e) => setAbsenceDate(e.target.value)}
                    required
                    className="w-full rounded-xl border border-[--hair] bg-surface px-3 py-2 text-sm text-ink"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Reason</label>
                  <div className="flex gap-2">
                    {REASONS.map((r) => (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setReason(r.value)}
                        className={`flex-1 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                          reason === r.value
                            ? "border-[--brand] bg-[color-mix(in_srgb,var(--brand)_10%,transparent)] text-ink"
                            : "border-[--hair] text-muted"
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Notes (optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Any additional info for the studio…"
                    className="w-full rounded-xl border border-[--hair] bg-surface px-3 py-2 text-sm text-ink resize-none"
                  />
                </div>

                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={requestMakeup}
                    onChange={(e) => setRequestMakeup(e.target.checked)}
                    className="h-4 w-4 rounded border-[--hair] accent-[--brand]"
                  />
                  <span className="text-sm text-ink">Request a makeup class</span>
                </label>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 rounded-xl border border-[--hair] py-2.5 text-sm font-semibold text-ink"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex-1 rounded-xl bg-brand py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                  >
                    {isPending ? "Reporting…" : "Report absence"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
