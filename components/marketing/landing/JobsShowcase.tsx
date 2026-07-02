"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { BrowserWindow } from "./BrowserWindow";
import { rise } from "./motion";

const ROWS = [
  { key: "manageStudio", num: "01", url: "app.olune.co.nz/projects", demo: "projects" as const },
  { key: "money", num: "02", url: "app.olune.co.nz/finances", demo: "finance" as const },
  { key: "liveSites", num: "03", url: "app.olune.co.nz/sites", demo: "sites" as const },
];

function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-landing-accent/40 bg-landing-accent/[0.09] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-landing-accent">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-landing-accent" />
      Live
    </span>
  );
}

function ProjectsDemo() {
  const tasks = [
    { name: "Brand refresh — Tempo Dance Co.", pct: 86, done: true },
    { name: "Website build — Kea Tours", pct: 62, done: false },
    { name: "Campaign assets — Moa & Co", pct: 38, done: false },
  ];
  return (
    <div className="flex flex-col gap-3.5 p-7">
      <div className="mb-1 flex items-center justify-between">
        <span className="font-[family-name:var(--font-landing-display)] text-xl italic text-landing-navy">
          Projects
        </span>
        <LiveBadge />
      </div>
      {tasks.map((task) => (
        <div
          key={task.name}
          className="flex items-center gap-3.5 rounded-xl border border-landing-navy/[0.07] bg-white px-4 py-3.5 shadow-[0_12px_28px_-22px_rgba(26,21,53,0.4)]"
        >
          {task.done ? (
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-landing-accent text-[11px] font-extrabold text-white">
              ✓
            </span>
          ) : (
            <span className="h-5 w-5 shrink-0 rounded-full border-[1.6px] border-landing-navy/20" />
          )}
          <div className="min-w-0 flex-1">
            <div className="mb-2 truncate text-[13.5px] font-semibold text-landing-navy">{task.name}</div>
            <div className="h-[7px] w-full overflow-hidden rounded bg-landing-navy/[0.06]">
              <div
                className="h-full rounded bg-[linear-gradient(90deg,var(--color-landing-accent),#6d5bd0)]"
                style={{ width: `${task.pct}%` }}
              />
            </div>
          </div>
          <span className="shrink-0 text-xs font-bold text-landing-navy/45">{task.pct}%</span>
        </div>
      ))}
      <div className="pt-1 text-center text-[12.5px] text-landing-navy/45">
        3 projects on track · nothing overdue
      </div>
    </div>
  );
}

function FinanceDemo() {
  const bars = [42, 68, 55, 88, 72, 96, 80];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];
  return (
    <div className="flex h-full flex-col p-7">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <div className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-landing-navy/42">
            This month
          </div>
          <div className="font-[family-name:var(--font-landing-display)] text-[34px] leading-none text-landing-navy">
            $14,280
          </div>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-landing-accent/40 bg-landing-accent/[0.09] px-3.5 py-1.5 text-xs font-bold text-landing-navy">
          ✓ Invoice #204 — Paid
        </span>
      </div>
      <div className="flex min-h-[120px] flex-1 items-end gap-2.5 border-b border-landing-navy/10 px-1">
        {bars.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t"
            style={{
              height: `${h}%`,
              background:
                i === 5 ? "linear-gradient(180deg,var(--color-landing-accent),#6d5bd0)" : "rgba(139,124,240,0.27)",
            }}
          />
        ))}
      </div>
      <div className="flex justify-between px-1 pt-2.5 text-[11px] text-landing-navy/40">
        {months.map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>
    </div>
  );
}

function SitesDemo() {
  const menu = [
    { name: "Ballet", price: "Tue & Thu · 5:30pm" },
    { name: "Hip hop", price: "Wed · 6:00pm" },
    { name: "Contemporary", price: "Sat · 10:00am" },
  ];
  return (
    <div className="flex h-full flex-col gap-2.5 p-7">
      <div className="text-[13px] text-landing-navy/55">
        Editing <span className="font-bold text-landing-navy">tempodance.co.nz</span>
        <span className="ml-0.5 inline-block h-[15px] w-0.5 animate-pulse bg-landing-accent align-middle" />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden rounded-[10px] border border-landing-navy/[0.12] bg-[#faf5fb] shadow-[0_16px_36px_-24px_rgba(26,21,53,0.5)]">
        <div className="flex items-center justify-between border-b border-[#3a2040]/10 px-4 py-2.5">
          <span className="font-[family-name:var(--font-landing-display)] text-[15px] text-[#3a2040]">
            Tempo Dance Co.
          </span>
          <span className="flex items-center gap-3 text-[10.5px] font-bold text-[#3a2040]/60">
            <span>Classes</span>
            <span>Timetable</span>
            <span>Visit</span>
            <span className="rounded-full bg-[#3a2040] px-2.5 py-1 text-[#faf5fb]">Enrol</span>
          </span>
        </div>
        <div className="relative bg-[linear-gradient(135deg,#2a1a33_0%,#46284d_100%)] p-4 outline outline-2 -outline-offset-2 outline-landing-accent">
          <span className="absolute right-0 top-0 rounded-bl-md bg-landing-accent px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.08em] text-white">
            Editing · Hero
          </span>
          <div className="font-[family-name:var(--font-landing-display)] text-[21px] italic leading-tight text-[#f3e4f6]">
            Every body can dance.
          </div>
          <div className="my-1.5 text-[11px] text-[#f3e4f6]/70">
            Classes 6 days a week · Ponsonby, Auckland
          </div>
          <span className="inline-block rounded-full bg-[#d4547e] px-3 py-1 text-[10.5px] font-bold text-white">
            Book a trial class
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2.5 px-4 py-3">
          {menu.map((m) => (
            <div key={m.name} className="overflow-hidden rounded-md border border-[#3a2040]/10 bg-white">
              <div className="h-[34px] bg-[repeating-linear-gradient(45deg,#ecd9ef_0_6px,#f3e7f5_6px_12px)]" />
              <div className="px-2 py-1.5">
                <div className="text-[10.5px] font-bold text-[#3a2040]">{m.name}</div>
                <div className="text-[10px] text-[#3a2040]/55">{m.price}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="pt-0.5 text-center text-[12.5px] text-landing-navy/45">
        Changes publish the moment you make them
      </div>
    </div>
  );
}

const DEMOS = { projects: ProjectsDemo, finance: FinanceDemo, sites: SitesDemo };

export function JobsShowcase() {
  const t = useTranslations("marketing.featuresSection");

  return (
    <div className="flex flex-col gap-20">
      {ROWS.map((row, i) => {
        const Demo = DEMOS[row.demo];
        const reversed = i % 2 === 1;
        return (
          <motion.div
            key={row.key}
            variants={rise}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            className={`flex flex-wrap items-center gap-14 ${reversed ? "flex-row-reverse" : ""}`}
          >
            <div className="min-w-[300px] flex-1">
              <div className="font-[family-name:var(--font-landing-display)] text-xl italic text-landing-accent">
                {row.num}
              </div>
              <h3 className="font-[family-name:var(--font-landing-display)] mb-5 mt-4 text-[clamp(27px,2.8vw,40px)] font-medium leading-[1.15] tracking-[-0.015em] text-landing-navy">
                {t(`${row.key}.title`)}
              </h3>
              <p className="max-w-[460px] text-[17px] leading-relaxed text-landing-navy/60">
                {t(`${row.key}.subtitle`)}
              </p>
            </div>
            <div className="flex min-w-[300px] flex-1 justify-center transition-transform duration-500 hover:-translate-y-2">
              <BrowserWindow url={row.url} className="max-w-[560px]">
                <Demo />
              </BrowserWindow>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
