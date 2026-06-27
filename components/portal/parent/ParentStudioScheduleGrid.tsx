"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useFormatTimeShort } from "@/lib/i18n/client";
import { formatMoney } from "@/lib/currency";
import {
  STUDIO_SCHEDULE_DAYS,
  classesByDay,
  type StudioScheduleClass,
} from "@/lib/portal/parent-studio-schedule";

const DISC_COLORS: Record<string, string> = {
  Ballet: "#C8102E",
  Jazz: "#5B5BFF",
  "Hip-Hop": "#E84A8A",
  Contemporary: "#13B6A4",
  Tap: "#C9A227",
  Lyrical: "#8B5CF6",
  Acro: "#F97316",
  Pointe: "#EC4899",
};

function classColor(cls: StudioScheduleClass) {
  const disc = cls.discipline;
  return disc && DISC_COLORS[disc] ? DISC_COLORS[disc] : "var(--brand)";
}

function ClassDetailModal({
  cls,
  onClose,
}: {
  cls: StudioScheduleClass;
  onClose: () => void;
}) {
  const t = useTranslations("parent.studioSchedule");
  const fmt = useFormatTimeShort();
  const color = classColor(cls);

  const meta = [cls.discipline, cls.level, cls.stream, cls.room].filter(Boolean).join(" · ");
  const timeLabel =
    cls.startTime &&
    `${fmt(cls.startTime)}${cls.endTime ? ` – ${fmt(cls.endTime)}` : ""}`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 8 }}
        className="w-full max-w-sm rounded-2xl border border-[--hair] bg-surface p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="mb-3 h-1 w-10 rounded-full"
          style={{ background: color }}
          aria-hidden
        />
        <h2 className="text-lg font-black leading-tight text-ink">{cls.name}</h2>
        {meta && <p className="mt-1 text-sm text-muted">{meta}</p>}
        {timeLabel && <p className="mt-2 text-sm font-semibold text-ink">{timeLabel}</p>}

        <dl className="mt-4 space-y-3 border-t border-[--hair] pt-4 text-sm">
          <div>
            <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted">
              {t("teacher")}
            </dt>
            <dd className="mt-0.5 font-medium text-ink">{cls.teacherName ?? t("teacherTba")}</dd>
          </div>
          <div>
            <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted">
              {t("costPerTerm")}
            </dt>
            <dd className="mt-0.5 font-bold text-brand">
              {cls.priceCents > 0 ? formatMoney(cls.priceCents) : t("free")}
            </dd>
          </div>
        </dl>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-xl border border-[--hair] py-2 text-sm font-semibold text-muted hover:text-ink"
        >
          {t("close")}
        </button>
      </motion.div>
    </motion.div>
  );
}

export default function ParentStudioScheduleGrid({
  classes,
}: {
  classes: StudioScheduleClass[];
}) {
  const t = useTranslations("parent.studioSchedule");
  const fmt = useFormatTimeShort();
  const [selected, setSelected] = useState<StudioScheduleClass | null>(null);

  const byDay = useMemo(() => classesByDay(classes), [classes]);
  const maxPerDay = useMemo(
    () => Math.max(1, ...STUDIO_SCHEDULE_DAYS.map(({ dow }) => byDay.get(dow)?.length ?? 0)),
    [byDay],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6"
    >
      <header>
        <Link href="/portal/parent" className="text-xs text-muted hover:text-ink">
          {t("backToHub")}
        </Link>
        <h1 className="mt-2 text-xl font-black tracking-tight text-ink sm:text-2xl">
          {t("title")}
        </h1>
        <p className="mt-1 text-xs text-muted sm:text-sm">{t("subtitle")}</p>
      </header>

      {classes.length === 0 ? (
        <p className="rounded-xl border border-[--hair] bg-surface px-4 py-8 text-center text-sm text-muted">
          {t("noClasses")}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[--hair] bg-surface">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-7 border-b border-[--hair]">
              {STUDIO_SCHEDULE_DAYS.map(({ key }) => (
                <div
                  key={key}
                  className="border-r border-[--hair] px-1 py-1.5 text-center last:border-r-0"
                >
                  <p className="text-[0.58rem] font-bold uppercase tracking-wide text-muted">
                    {t(`days.${key}`)}
                  </p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {STUDIO_SCHEDULE_DAYS.map(({ dow, key }) => {
                const dayClasses = byDay.get(dow) ?? [];
                return (
                  <div
                    key={key}
                    className="border-r border-[--hair] p-1 last:border-r-0"
                    style={{ minHeight: `${Math.min(maxPerDay, 12) * 2.75 + 0.5}rem` }}
                  >
                    {dayClasses.length === 0 ? (
                      <p className="px-0.5 py-2 text-center text-[0.55rem] text-muted/60">—</p>
                    ) : (
                      <div className="space-y-0.5">
                        {dayClasses.map((cls) => {
                          const color = classColor(cls);
                          return (
                            <button
                              key={cls.id}
                              type="button"
                              onClick={() => setSelected(cls)}
                              className="group w-full rounded px-1 py-0.5 text-left transition hover:brightness-95"
                              style={{
                                background: `${color}14`,
                                borderLeft: `2px solid ${color}`,
                              }}
                            >
                              <p className="truncate text-[0.58rem] font-bold leading-tight text-ink">
                                {cls.name}
                              </p>
                              {cls.startTime && (
                                <p className="text-[0.52rem] leading-tight text-muted">
                                  {fmt(cls.startTime)}
                                </p>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <p className="text-[0.65rem] text-muted">{t("hint")}</p>

      <AnimatePresence>
        {selected && <ClassDetailModal cls={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </motion.div>
  );
}
