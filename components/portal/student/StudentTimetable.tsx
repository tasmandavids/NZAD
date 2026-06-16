"use client";

// ============================================================================
//  StudentTimetable — the visual layer for the student portal.
//  Receives pre-fetched enrollment data (no Supabase calls here).
//  Three sections:
//    1.  Today's classes  — prominent banner(s) if anything is on today
//    2.  Weekly timetable — days-of-week columns with class chips
//    3.  My classes list  — all enrolled classes as detail cards
// ============================================================================

import { motion } from "framer-motion";
import type { EnrolledClass } from "@/app/portal/student/page";

const SHOW_DAYS = [1, 2, 3, 4, 5, 6]; // Mon–Sat (skip Sun index 0)

function fmt(time: string | null) {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "pm" : "am";
  const h12 = h % 12 || 12;
  return m === 0 ? `${h12}${ampm}` : `${h12}:${m.toString().padStart(2, "0")}${ampm}`;
}

const DISC_COLORS: Record<string, string> = {
  Ballet: "#C8102E", Jazz: "#5B5BFF", "Hip-Hop": "#E84A8A",
  Contemporary: "#13B6A4", Tap: "#C9A227", Lyrical: "#8B5CF6",
  Acro: "#F97316", Pointe: "#EC4899",
};

function discColor(discipline: string | null) {
  return discipline && DISC_COLORS[discipline] ? DISC_COLORS[discipline] : "var(--brand)";
}

export default function StudentTimetable({
  classes,
  studentName,
  todayDow,
  dayNames,
}: {
  classes: EnrolledClass[];
  studentName: string | null;
  todayDow: number;
  dayNames: string[];
}) {
  const today = classes.filter((c) => c.dayOfWeek === todayDow);
  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  })();

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
      className="mx-auto max-w-5xl space-y-10 p-6"
    >
      {/* Header */}
      <motion.header
        variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
        className="flex flex-wrap items-end justify-between gap-3"
      >
        <div>
          <p className="text-sm text-muted">{greeting}{studentName ? `, ${studentName.split(" ")[0]}` : ""}.</p>
          <h1 className="text-2xl font-black tracking-tight text-ink">My Timetable</h1>
        </div>
        <p className="text-sm text-muted">
          {new Date().toLocaleDateString("en-NZ", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </motion.header>

      {/* Today's classes */}
      <motion.section
        variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
      >
        <h2 className="mb-3 text-xs uppercase tracking-widest text-muted">
          Today · {dayNames[todayDow]}
        </h2>
        {today.length === 0 ? (
          <div className="rounded-2xl border border-[--hair] bg-surface px-6 py-8 text-center">
            <p className="text-sm text-muted">No classes today — enjoy the rest day.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {today.map((c) => (
              <div
                key={c.enrollmentId}
                className="relative overflow-hidden rounded-2xl border border-[--hair] bg-surface p-5"
                style={{ borderLeftColor: discColor(c.discipline), borderLeftWidth: 3 }}
              >
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background: `radial-gradient(80% 80% at 0% 50%, ${discColor(c.discipline)}18, transparent 70%)`,
                  }}
                />
                <div className="relative flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-black text-ink">{c.name}</p>
                    <p className="mt-0.5 text-sm text-muted">
                      {c.discipline && <span>{c.discipline} · </span>}
                      {c.level && <span>{c.level} · </span>}
                      {c.teacherName && <span>{c.teacherName}</span>}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black tabular-nums text-ink">{fmt(c.startTime)}</p>
                    {c.endTime && (
                      <p className="text-xs text-muted">until {fmt(c.endTime)}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.section>

      {/* Weekly timetable grid */}
      <motion.section
        variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
      >
        <h2 className="mb-3 text-xs uppercase tracking-widest text-muted">Weekly schedule</h2>
        <div
          className="overflow-x-auto rounded-2xl border border-[--hair] bg-surface p-4"
        >
          <div
            className="grid min-w-[480px] gap-2"
            style={{ gridTemplateColumns: `repeat(${SHOW_DAYS.length}, minmax(0,1fr))` }}
          >
            {/* Day headers */}
            {SHOW_DAYS.map((d) => (
              <div
                key={d}
                className={`pb-2 text-center text-[0.65rem] font-semibold uppercase tracking-wider ${
                  d === todayDow ? "text-brand" : "text-muted"
                }`}
              >
                {dayNames[d].slice(0, 3)}
              </div>
            ))}
            {/* Class chips per day */}
            {SHOW_DAYS.map((d) => {
              const dayClasses = classes.filter((c) => c.dayOfWeek === d);
              return (
                <div key={d} className="flex flex-col gap-1.5 min-h-[60px]">
                  {dayClasses.map((c) => (
                    <div
                      key={c.enrollmentId}
                      className="rounded-lg px-2 py-1.5 text-center"
                      style={{
                        background: `${discColor(c.discipline)}22`,
                        borderLeft: `2px solid ${discColor(c.discipline)}`,
                      }}
                    >
                      <p className="text-[0.65rem] font-bold leading-tight text-ink">{c.name}</p>
                      {c.startTime && (
                        <p className="text-[0.58rem] text-muted">{fmt(c.startTime)}</p>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </motion.section>

      {/* All classes detail list */}
      <motion.section
        variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
      >
        <h2 className="mb-3 text-xs uppercase tracking-widest text-muted">
          My classes · {classes.length} enrolled
        </h2>
        {classes.length === 0 ? (
          <div className="rounded-2xl border border-[--hair] bg-surface px-6 py-10 text-center">
            <p className="text-sm text-muted">No active enrolments found.</p>
            <p className="mt-1 text-xs text-muted">Your studio admin will assign you to classes.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {classes.map((c) => (
              <motion.div
                key={c.enrollmentId}
                whileHover={{ y: -2 }}
                className="rounded-2xl border border-[--hair] bg-surface p-4"
              >
                <div className="flex items-start gap-3">
                  <span
                    className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: discColor(c.discipline) }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-ink truncate">{c.name}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {c.discipline && <>{c.discipline} · </>}
                      {c.level}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                      <span>{dayNames[c.dayOfWeek]}</span>
                      {c.startTime && (
                        <span>{fmt(c.startTime)}{c.endTime ? ` – ${fmt(c.endTime)}` : ""}</span>
                      )}
                      {c.teacherName && <span>with {c.teacherName}</span>}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.section>
    </motion.div>
  );
}
