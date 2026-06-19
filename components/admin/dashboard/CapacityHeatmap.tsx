"use client";

// ============================================================================
//  CapacityHeatmap — days × time-slots grid. Each scheduled class is a cell
//  coloured by occupancy: empty = grey, full = deep red (via color-mix on the
//  brand token, so it tracks the studio's palette). Full classes get a ring.
//  Chose a CSS grid over Recharts: precise control, native theming, and it
//  reads instantly as a heatmap.
// ============================================================================

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { DAYS, TIMES, type HeatClass } from "./types";

function fillColor(ratio: number) {
  if (ratio >= 1) return "var(--brand-deep)"; // full → deepest red
  // grey → red as the class fills
  return `color-mix(in srgb, var(--brand) ${Math.round(ratio * 100)}%, var(--heat-empty))`;
}

export function CapacityHeatmap({
  classes,
  days = DAYS,
  times = TIMES,
}: {
  classes: HeatClass[];
  /** Day column headers — defaults to Mon–Sat. Pass real day names from live data. */
  days?: string[];
  /** Time row labels — defaults to the 5 fixed after-school slots. Pass real times from live data. */
  times?: string[];
}) {
  const t = useTranslations("admin.dashboard.capacity");
  const [hover, setHover] = useState<HeatClass | null>(null);

  // index classes by `${day}-${slot}` for O(1) cell lookup
  const grid = useMemo(() => {
    const m = new Map<string, HeatClass>();
    classes.forEach((c) => m.set(`${c.day}-${c.slot}`, c));
    return m;
  }, [classes]);

  return (
    <section
      className="relative rounded-2xl border border-[--hair] bg-surface p-6"
      style={{ ["--heat-empty" as string]: "color-mix(in srgb, var(--text) 7%, var(--surface))" }}
    >
      <header className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-ink">{t("title")}</h2>
          <p className="text-sm text-muted">{t("subtitle")}</p>
        </div>
        {/* legend */}
        <div className="flex items-center gap-2 text-xs text-muted">
          <span>{t("empty")}</span>
          <span className="h-2.5 w-28 rounded-full"
            style={{ background: "linear-gradient(90deg, var(--heat-empty), var(--brand) 80%, var(--brand-deep))" }} />
          <span>{t("full")}</span>
        </div>
      </header>

      {/* grid: 1 label column + N day columns */}
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `48px repeat(${days.length}, minmax(0,1fr))` }}>
        <div />
        {days.map((d) => (
          <div key={d} className="pb-1 text-center text-xs font-semibold uppercase tracking-wider text-muted">{d}</div>
        ))}

        {times.map((time, row) => (
          <div key={time} className="contents">
            <div className="flex items-center justify-end pr-2 text-[0.65rem] tabular-nums text-muted">{time}</div>
            {days.map((_, col) => {
              const cls = grid.get(`${col}-${row}`);
              const ratio = cls ? cls.enrolled / cls.capacity : -1;
              const full = ratio >= 1;
              return (
                <motion.div
                  key={`${col}-${row}`}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: (row * DAYS.length + col) * 0.012, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={cls ? { scale: 1.06, zIndex: 5 } : undefined}
                  onHoverStart={() => cls && setHover(cls)}
                  onHoverEnd={() => setHover(null)}
                  className="relative grid aspect-[4/3] place-items-center rounded-lg"
                  style={{
                    background: cls ? fillColor(ratio) : "color-mix(in srgb, var(--text) 3%, var(--surface))",
                    boxShadow: full ? "inset 0 0 0 1.5px var(--brand-hot)" : "inset 0 0 0 1px var(--hair)",
                    cursor: cls ? "pointer" : "default",
                  }}
                >
                  {cls && (
                    <span
                      className="select-none text-[0.62rem] font-bold tabular-nums"
                      style={{ color: ratio > 0.5 ? "#fff" : "var(--text)" }}
                    >
                      {cls.enrolled}/{cls.capacity}
                    </span>
                  )}
                </motion.div>
              );
            })}
          </div>
        ))}
      </div>

      {/* hover tooltip */}
      {hover && (
        <div className="pointer-events-none absolute bottom-6 left-6 rounded-xl border border-[--hair] bg-base/90 px-3 py-2 text-xs shadow-xl backdrop-blur">
          <p className="font-bold text-ink">{hover.name}</p>
          <p className="text-muted">
            {t("tooltipRoom", { room: hover.room, enrolled: hover.enrolled, capacity: hover.capacity })}
            {hover.enrolled >= hover.capacity && (
              <span style={{ color: "var(--brand-hot)" }}>{t("tooltipFull")}</span>
            )}
          </p>
        </div>
      )}
    </section>
  );
}
