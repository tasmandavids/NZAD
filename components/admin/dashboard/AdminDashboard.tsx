"use client";

// ============================================================================
//  AdminDashboard — composes the overview. Receives already-fetched data as
//  props (page.tsx does the Supabase queries server-side), so this stays a
//  pure, testable presentation layer.
// ============================================================================

import { motion } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import { StatCard } from "./StatCard";
import { CapacityHeatmap } from "./CapacityHeatmap";
import { ScheduleBuilder } from "./ScheduleBuilder";
import type { Stat, HeatClass, ClassBlock } from "./types";

export function AdminDashboard({
  studioName,
  stats,
  heat,
  heatDays,
  heatTimes,
  scheduleClasses,
}: {
  studioName: string;
  stats: Stat[];
  heat: HeatClass[];
  heatDays?: string[];
  heatTimes?: string[];
  scheduleClasses: ClassBlock[];
}) {
  const tGreeting = useTranslations("common.greeting");
  const locale = useLocale();
  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? tGreeting("morning") : h < 18 ? tGreeting("afternoon") : tGreeting("evening");
  })();

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
      className="mx-auto max-w-6xl space-y-8 p-6"
    >
      <motion.header
        variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
        className="flex flex-wrap items-end justify-between gap-3"
      >
        <div>
          <p className="text-sm text-muted">{greeting},</p>
          <h1 className="text-2xl font-black tracking-tight text-ink">{studioName}</h1>
        </div>
        <p className="text-sm text-muted">
          {new Date().toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </motion.header>

      {/* 1 — stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s, i) => <StatCard key={s.id} stat={s} index={i} />)}
      </div>

      {/* 2 — capacity heatmap */}
      <motion.div variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }}>
        <CapacityHeatmap classes={heat} days={heatDays} times={heatTimes} />
      </motion.div>

      {/* 3 — drag-and-drop schedule builder */}
      <ScheduleBuilder classes={scheduleClasses} />
    </motion.div>
  );
}
