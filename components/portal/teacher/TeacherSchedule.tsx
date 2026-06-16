"use client";

// ============================================================================
//  TeacherSchedule — schedule overview + interactive roll-call card.
//  Today's classes are expanded at the top with per-student attendance toggles.
//  The rest of the week is shown as a compact schedule below.
// ============================================================================

import { useState, useTransition } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { markAttendance } from "@/app/portal/teacher/actions";
import type { TeacherClass } from "@/app/portal/teacher/page";

type AttStatus = "present" | "absent" | "late" | "excused" | null;

const ATT_OPTS: { value: AttStatus; label: string; color: string }[] = [
  { value: "present", label: "Present", color: "#22c55e" },
  { value: "late",    label: "Late",    color: "#f59e0b" },
  { value: "absent",  label: "Absent",  color: "#ef4444" },
  { value: "excused", label: "Excused", color: "#8b8b92" },
];

function fmt(time: string | null) {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "pm" : "am";
  return `${h % 12 || 12}${m ? `:${m.toString().padStart(2, "0")}` : ""}${ampm}`;
}

// ── Roll-call card for one class ────────────────────────────────────────────
function RollCallCard({ cls, todayDate }: { cls: TeacherClass; todayDate: string }) {
  const [statuses, setStatuses] = useState<Record<string, AttStatus>>(() =>
    Object.fromEntries(cls.students.map((s) => [s.studentId, s.attendanceStatus])),
  );
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  const toggle = (studentId: string, next: AttStatus) => {
    // Optimistic update
    setStatuses((prev) => ({ ...prev, [studentId]: next }));
    startTransition(async () => {
      const result = await markAttendance({
        classId:   cls.id,
        studentId,
        date:      todayDate,
        status:    next ?? "present",
      });
      if (!result.ok) {
        // Roll back
        setStatuses((prev) => ({ ...prev, [studentId]: cls.students.find(s => s.studentId === studentId)?.attendanceStatus ?? null }));
        setFeedback(result.error);
        setTimeout(() => setFeedback(null), 3000);
      }
    });
  };

  const markedCount = Object.values(statuses).filter(Boolean).length;
  const total = cls.students.length;

  return (
    <div className="overflow-hidden rounded-2xl border border-[--hair] bg-surface">
      {/* Class header */}
      <div
        className="flex items-center justify-between px-5 py-4 border-b border-[--hair]"
        style={{ background: "color-mix(in srgb, var(--brand) 8%, var(--surface))" }}
      >
        <div>
          <h3 className="font-black text-ink">{cls.name}</h3>
          <p className="text-xs text-muted">
            {cls.discipline && <>{cls.discipline} · </>}
            {cls.level && <>{cls.level} · </>}
            {fmt(cls.startTime)}{cls.endTime && ` – ${fmt(cls.endTime)}`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-black tabular-nums text-ink">{markedCount}/{total}</p>
          <p className="text-xs text-muted">marked</p>
        </div>
      </div>

      {/* Student roster */}
      {cls.students.length === 0 ? (
        <p className="px-5 py-6 text-center text-sm text-muted">No enrolled students.</p>
      ) : (
        <ul className="divide-y divide-[--hair]">
          {cls.students.map((student) => {
            const status = statuses[student.studentId];
            return (
              <li key={student.studentId} className="flex items-center gap-3 px-5 py-3">
                {/* Avatar */}
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-black text-white"
                  style={{ background: "var(--brand-deep)" }}
                >
                  {student.name?.[0]?.toUpperCase() ?? "?"}
                </span>
                <Link
                  href={`/portal/teacher/students/${student.studentId}`}
                  className="flex-1 text-sm font-medium text-ink hover:text-[--brand] hover:underline"
                >
                  {student.name ?? "Unknown student"}
                </Link>
                {/* Attendance toggles */}
                <div className="flex gap-1">
                  {ATT_OPTS.map((opt) => {
                    const active = status === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => toggle(student.studentId, active ? null : opt.value)}
                        disabled={pending}
                        title={opt.label}
                        className="rounded-full px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-wide transition-all"
                        style={{
                          background: active ? opt.color : "color-mix(in srgb, var(--text) 6%, transparent)",
                          color: active ? "#fff" : "var(--muted)",
                          borderWidth: 1,
                          borderStyle: "solid",
                          borderColor: active ? opt.color : "var(--hair)",
                        }}
                      >
                        {opt.label[0]}
                      </button>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Error feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="px-5 py-2 text-xs text-red-400"
          >
            {feedback}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Compact schedule row ─────────────────────────────────────────────────────
function ScheduleRow({ cls, dayName }: { cls: TeacherClass; dayName: string }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-[--hair] px-4 py-3 bg-surface">
      <div className="w-12 shrink-0 text-center">
        <p className="text-[0.62rem] font-semibold uppercase tracking-wider text-muted">
          {dayName.slice(0, 3)}
        </p>
        <p className="text-xs font-bold tabular-nums text-ink">{fmt(cls.startTime)}</p>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-ink truncate">{cls.name}</p>
        <p className="text-xs text-muted">
          {cls.discipline && <>{cls.discipline} · </>}
          {cls.level && <>{cls.level} · </>}
          {cls.students.length} students
        </p>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function TeacherSchedule({
  teacherName,
  classes,
  todayDow,
  todayDate,
  dayNames,
}: {
  teacherName: string | null;
  classes: TeacherClass[];
  todayDow: number;
  todayDate: string;
  dayNames: string[];
}) {
  const todayClasses = classes.filter((c) => c.dayOfWeek === todayDow);
  const otherClasses = classes.filter((c) => c.dayOfWeek !== todayDow);

  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  })();

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
      className="mx-auto max-w-3xl space-y-10 p-6"
    >
      {/* Header */}
      <motion.header
        variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
        className="flex flex-wrap items-end justify-between gap-3"
      >
        <div>
          <p className="text-sm text-muted">
            {greeting}{teacherName ? `, ${teacherName.split(" ")[0]}` : ""}.
          </p>
          <h1 className="text-2xl font-black tracking-tight text-ink">Schedule & Roll</h1>
        </div>
        <p className="text-sm text-muted">
          {new Date().toLocaleDateString("en-NZ", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </motion.header>

      {/* Today's roll call */}
      <motion.section
        variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
      >
        <h2 className="mb-3 text-xs uppercase tracking-widest text-muted">
          Today's roll · {dayNames[todayDow]}
        </h2>
        {todayClasses.length === 0 ? (
          <div className="rounded-2xl border border-[--hair] bg-surface px-6 py-8 text-center">
            <p className="text-sm text-muted">No classes today.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {todayClasses.map((cls) => (
              <RollCallCard key={cls.id} cls={cls} todayDate={todayDate} />
            ))}
          </div>
        )}
      </motion.section>

      {/* Rest of week */}
      {otherClasses.length > 0 && (
        <motion.section
          variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
        >
          <h2 className="mb-3 text-xs uppercase tracking-widest text-muted">
            This week · {classes.length} class{classes.length !== 1 ? "es" : ""} total
          </h2>
          <div className="space-y-2">
            {otherClasses.map((cls) => (
              <ScheduleRow
                key={cls.id}
                cls={cls}
                dayName={dayNames[cls.dayOfWeek]}
              />
            ))}
          </div>
        </motion.section>
      )}

      {/* Empty state */}
      {classes.length === 0 && (
        <div className="rounded-2xl border border-[--hair] bg-surface px-6 py-12 text-center">
          <p className="text-sm text-muted">No classes assigned to you yet.</p>
          <p className="mt-1 text-xs text-muted">
            Ask your studio admin to assign classes to your teacher account.
          </p>
        </div>
      )}
    </motion.div>
  );
}
