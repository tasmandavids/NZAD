"use client";

// ============================================================================
//  StatCard — one sleek metric tile.
//  • count-up animation on mount (useMotionValue → animate)
//  • inline SVG sparkline
//  • hover lift + brand glow
//  Colours come from the tenant tokens (bg-surface, text-ink, bg-brand…), so
//  this is red/black/white by default and reskins per studio automatically.
// ============================================================================

import { motion, useMotionValue, animate } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import type { Stat } from "./types";

function Sparkline({ data }: { data: number[] }) {
  const w = 96, h = 32, pad = 2;
  const min = Math.min(...data), max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((d - min) / span) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg width={w} height={h} className="overflow-visible" aria-hidden>
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke="var(--brand-hot)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={pts[pts.length - 1].split(",")[0]}
        cy={pts[pts.length - 1].split(",")[1]}
        r={3}
        fill="var(--brand-hot)"
      />
    </svg>
  );
}

export function StatCard({ stat, index = 0 }: { stat: Stat; index?: number }) {
  const mv = useMotionValue(0);
  const [display, setDisplay] = useState(0);
  const locale = useLocale();
  const currency = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "NZD",
        maximumFractionDigits: 0,
      }),
    [locale],
  );

  useEffect(() => {
    const controls = animate(mv, stat.value, { duration: 1.1, ease: [0.16, 1, 0.3, 1] });
    const unsub = mv.on("change", (v) => setDisplay(v));
    return () => { controls.stop(); unsub(); };
  }, [stat.value, mv]);

  const formatted =
    stat.format === "currency"
      ? currency.format(display)
      : Math.round(display).toLocaleString(locale);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4 }}
      className="group relative overflow-hidden rounded-2xl border border-[--hair] bg-surface p-5"
    >
      {/* brand wash on hover */}
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
           style={{ background: "radial-gradient(120% 80% at 100% 0%, color-mix(in srgb, var(--brand) 14%, transparent), transparent 70%)" }} />
      <div className="relative">
        <div className="flex items-start justify-between">
          <span className="text-xs uppercase tracking-widest text-muted">{stat.label}</span>
          {stat.spark && <Sparkline data={stat.spark} />}
        </div>
        <div className="mt-3 flex items-end gap-3">
          <span className="text-4xl font-black tracking-tight text-ink tabular-nums">{formatted}</span>
          {!!stat.trend && (
            <span className="mb-1 inline-flex items-center gap-1 rounded-full border border-[--hair] px-2 py-0.5 text-xs font-semibold text-ink">
              <span style={{ color: "var(--brand-hot)" }}>{stat.trend > 0 ? "↑" : "↓"}</span>
              {Math.abs(stat.trend)}%
            </span>
          )}
        </div>
        {stat.hint && <p className="mt-1 text-xs text-muted">{stat.hint}</p>}
      </div>
    </motion.div>
  );
}
