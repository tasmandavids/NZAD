"use client";

// ============================================================================
//  StudentsManager — searchable student roster + detail panel.
//  Slide-over panel shows a student's enrolled classes and allows
//  admin to enroll them in additional classes or remove them.
// ============================================================================

import { useState, useTransition } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { enrollStudent, unenrollStudent, dropEnrollment, addStudent } from "@/app/portal/admin/students/actions";
import type { StudentRow, ClassOption } from "@/app/portal/admin/students/page";

// ─── helpers ─────────────────────────────────────────────────────────────────

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function fmt(time: string | null) {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")}${h >= 12 ? "pm" : "am"}`;
}

function initials(name: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

// ─── add student slide-over ──────────────────────────────────────────────────

function AddStudentPanel({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ fullName: "", email: "", phone: "" });
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await addStudent(form);
      if (!result.ok) { setError(result.error); return; }
      onClose();
    });
  };

  return (
    <>
      <motion.div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.aside
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-[--hair] bg-surface shadow-2xl"
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 380, damping: 38 }}
      >
        <div className="flex items-center justify-between border-b border-[--hair] px-6 py-4">
          <h2 className="font-black text-ink">Add student</h2>
          <button onClick={onClose} className="text-muted hover:text-ink">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <label className="block text-[0.68rem] font-semibold uppercase tracking-wider text-muted mb-1">
              Full name *
            </label>
            <input
              value={form.fullName}
              onChange={(e) => set("fullName")(e.target.value)}
              placeholder="e.g. Emma Johnson"
              className="w-full rounded-lg border border-[--hair] bg-base px-3 py-2 text-sm text-ink
                         placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-[--brand]"
            />
          </div>
          <div>
            <label className="block text-[0.68rem] font-semibold uppercase tracking-wider text-muted mb-1">
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set("email")(e.target.value)}
              placeholder="emma@example.com"
              className="w-full rounded-lg border border-[--hair] bg-base px-3 py-2 text-sm text-ink
                         placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-[--brand]"
            />
          </div>
          <div>
            <label className="block text-[0.68rem] font-semibold uppercase tracking-wider text-muted mb-1">
              Phone
            </label>
            <input
              value={form.phone}
              onChange={(e) => set("phone")(e.target.value)}
              placeholder="+64 21 234 567"
              className="w-full rounded-lg border border-[--hair] bg-base px-3 py-2 text-sm text-ink
                         placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-[--brand]"
            />
          </div>
          {error && (
            <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-400">
              {error}
            </p>
          )}
        </div>
        <div className="flex gap-3 border-t border-[--hair] px-6 py-4">
          <button onClick={onClose} className="flex-1 rounded-xl border border-[--hair] py-2.5 text-sm text-muted hover:text-ink">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={pending || !form.fullName}
            className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-50"
            style={{ background: "var(--brand)" }}
          >
            {pending ? "Adding…" : "Add student"}
          </button>
        </div>
      </motion.aside>
    </>
  );
}

// ─── student detail panel ────────────────────────────────────────────────────

function StudentPanel({
  student,
  allClasses,
  onClose,
}: {
  student: StudentRow;
  allClasses: ClassOption[];
  onClose: () => void;
}) {
  const [selectedClassId, setSelectedClassId] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const enrolledIds = new Set(student.enrollments.map((e) => e.classId));
  const available = allClasses.filter((c) => !enrolledIds.has(c.id));

  const enroll = () => {
    if (!selectedClassId) return;
    setError(null); setSuccess(null);
    startTransition(async () => {
      const result = await enrollStudent({ studentId: student.id, classId: selectedClassId });
      if (!result.ok) { setError(result.error); return; }
      setSelectedClassId("");
      setSuccess("Enrolled successfully.");
      setTimeout(() => setSuccess(null), 2500);
    });
  };

  const unenroll = (classId: string) => {
    setError(null); setSuccess(null);
    startTransition(async () => {
      const result = await unenrollStudent(student.id, classId);
      if (!result.ok) { setError(result.error); return; }
    });
  };

  const drop = (classId: string) => {
    setError(null); setSuccess(null);
    startTransition(async () => {
      const result = await dropEnrollment(student.id, classId);
      if (!result.ok) { setError(result.error); return; }
      setSuccess("Enrollment dropped.");
      setTimeout(() => setSuccess(null), 2500);
    });
  };

  return (
    <>
      <motion.div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.aside
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-[--hair] bg-surface shadow-2xl"
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 380, damping: 38 }}
      >
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-[--hair] px-6 py-5">
          <span
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-lg font-black text-white"
            style={{ background: "var(--brand)" }}
          >
            {initials(student.name)}
          </span>
          <div className="flex-1 min-w-0">
            <h2 className="font-black text-ink truncate">{student.name ?? "Unknown"}</h2>
            <p className="text-xs text-muted truncate">{student.email ?? student.phone ?? "No contact"}</p>
          </div>
          <button onClick={onClose} className="shrink-0 text-muted hover:text-ink">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Full profile / progress link */}
          <Link
            href={`/portal/admin/students/${student.id}`}
            className="flex items-center justify-between rounded-xl border border-[--hair] bg-base px-4 py-3 text-sm font-semibold text-ink transition-colors hover:border-[--brand]"
          >
            View progress &amp; profile
            <span className="text-[--brand]">→</span>
          </Link>

          {/* Current enrollments */}
          <section>
            <h3 className="mb-2 text-[0.68rem] font-semibold uppercase tracking-wider text-muted">
              Enrolled classes · {student.enrollments.length}
            </h3>
            {student.enrollments.length === 0 ? (
              <p className="text-sm text-muted">Not enrolled in any classes yet.</p>
            ) : (
              <ul className="space-y-2">
                {student.enrollments.map((e) => (
                  <li key={e.classId} className="flex items-center gap-3 rounded-xl border border-[--hair] bg-base px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-ink truncate">{e.className}</p>
                      <p className="text-xs text-muted">
                        {DAY_SHORT[e.dayOfWeek]}
                        {e.startTime ? ` · ${fmt(e.startTime)}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => drop(e.classId)}
                        disabled={pending}
                        title="Soft-cancel: keeps history and frees a spot for the waitlist"
                        className="text-xs text-muted transition-colors hover:text-amber-400"
                      >
                        Drop
                      </button>
                      <span className="text-[--hair]">·</span>
                      <button
                        onClick={() => unenroll(e.classId)}
                        disabled={pending}
                        title="Permanently delete this enrollment record"
                        className="text-xs text-muted transition-colors hover:text-red-400"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Enroll in a new class */}
          {available.length > 0 && (
            <section>
              <h3 className="mb-2 text-[0.68rem] font-semibold uppercase tracking-wider text-muted">
                Enroll in a class
              </h3>
              <div className="flex gap-2">
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="flex-1 rounded-lg border border-[--hair] bg-base px-3 py-2 text-sm text-ink
                             focus:outline-none focus:ring-1 focus:ring-[--brand]"
                >
                  <option value="">— choose class —</option>
                  {available.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.discipline ? ` (${c.discipline})` : ""}
                      {" — "}
                      {DAY_SHORT[c.dayOfWeek]}
                      {c.startTime ? ` ${fmt(c.startTime)}` : ""}
                    </option>
                  ))}
                </select>
                <button
                  onClick={enroll}
                  disabled={pending || !selectedClassId}
                  className="shrink-0 rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50 transition-opacity hover:opacity-90"
                  style={{ background: "var(--brand)" }}
                >
                  Enroll
                </button>
              </div>
            </section>
          )}

          {error && (
            <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-400">
              {error}
            </p>
          )}
          {success && (
            <p className="rounded-lg border border-green-400/30 bg-green-400/10 px-3 py-2 text-xs text-green-400">
              {success}
            </p>
          )}
        </div>
      </motion.aside>
    </>
  );
}

// ─── student card ────────────────────────────────────────────────────────────

function StudentCard({ student, onClick }: { student: StudentRow; onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -2 }}
      className="w-full text-left rounded-2xl border border-[--hair] bg-surface p-4 transition-shadow hover:shadow-md"
    >
      <div className="mb-3 flex items-center gap-3">
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-black text-white"
          style={{ background: "var(--brand)" }}
        >
          {initials(student.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-ink truncate">{student.name ?? "Unnamed"}</p>
          <p className="text-xs text-muted truncate">{student.email ?? student.phone ?? "—"}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {student.enrollments.length === 0 ? (
          <span className="text-xs text-muted italic">No classes</span>
        ) : (
          student.enrollments.slice(0, 3).map((e) => (
            <span
              key={e.classId}
              className="rounded-full border border-[--hair] px-2 py-0.5 text-[0.62rem] font-medium text-ink"
            >
              {e.className}
            </span>
          ))
        )}
        {student.enrollments.length > 3 && (
          <span className="rounded-full border border-[--hair] px-2 py-0.5 text-[0.62rem] text-muted">
            +{student.enrollments.length - 3} more
          </span>
        )}
      </div>
    </motion.button>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

export default function StudentsManager({
  students,
  allClasses,
}: {
  students: StudentRow[];
  allClasses: ClassOption[];
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<StudentRow | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const filtered = students.filter(
    (s) =>
      !search ||
      (s.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (s.email ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-5xl space-y-6 p-6"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-ink">Students</h1>
          <p className="text-sm text-muted">
            {students.length} student{students.length !== 1 ? "s" : ""} · click to manage enrollments
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
          style={{ background: "var(--brand)" }}
        >
          + Add student
        </button>
      </div>

      {/* Search */}
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name or email…"
        className="w-full max-w-sm rounded-xl border border-[--hair] bg-surface px-4 py-2.5 text-sm
                   text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-[--brand]"
      />

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-[--hair] bg-surface px-6 py-12 text-center">
          <p className="text-sm text-muted">
            {search ? "No students match your search." : "No students yet — add your first one above."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <StudentCard key={s.id} student={s} onClick={() => setSelected(s)} />
          ))}
        </div>
      )}

      {/* Panels */}
      <AnimatePresence>
        {selected && (
          <StudentPanel
            student={selected}
            allClasses={allClasses}
            onClose={() => setSelected(null)}
          />
        )}
        {showAdd && <AddStudentPanel onClose={() => setShowAdd(false)} />}
      </AnimatePresence>
    </motion.div>
  );
}
