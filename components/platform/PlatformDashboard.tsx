"use client";

import { motion } from "framer-motion";
import Link from "next/link";

type Stat = { id: string; label: string; value: string | number; hint?: string };

export function PlatformDashboard({
  stats,
  recentStudios,
  openTasks,
  openThreads,
}: {
  stats: Stat[];
  recentStudios: { id: string; name: string; slug: string; status: string; createdAt: string }[];
  openTasks: { id: string; title: string; priority: string; dueAt: string | null }[];
  openThreads: { id: string; subject: string; studioName: string; priority: string }[];
}) {
  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  })();

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
      className="mx-auto max-w-6xl space-y-8 p-6"
    >
      <motion.header
        variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
        className="flex flex-wrap items-end justify-between gap-3"
      >
        <div>
          <p className="text-sm text-muted">{greeting},</p>
          <h1 className="text-2xl font-black tracking-tight text-ink">Platform overview</h1>
        </div>
        <p className="text-sm text-muted">
          {new Date().toLocaleDateString("en-NZ", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </motion.header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <motion.div
            key={s.id}
            variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
            className="rounded-2xl border border-[--hair] bg-surface p-5"
          >
            <p className="text-xs uppercase tracking-widest text-muted">{s.label}</p>
            <p className="mt-2 text-3xl font-black text-ink">{s.value}</p>
            {s.hint && <p className="mt-1 text-xs text-muted">{s.hint}</p>}
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-[--hair] bg-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted">Recent signups</h2>
            <Link href="/platform/studios" className="text-xs text-brand hover:underline">
              All studios →
            </Link>
          </div>
          <ul className="space-y-3">
            {recentStudios.length === 0 && (
              <li className="text-sm text-muted">No studios yet.</li>
            )}
            {recentStudios.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 text-sm">
                <div>
                  <p className="font-semibold text-ink">{s.name}</p>
                  <p className="text-xs text-muted">{s.slug}</p>
                </div>
                <span className="rounded-full bg-base px-2 py-0.5 text-[0.65rem] uppercase tracking-wide text-muted">
                  {s.status}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-[--hair] bg-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted">Open support</h2>
            <Link href="/platform/messages" className="text-xs text-brand hover:underline">
              Inbox →
            </Link>
          </div>
          <ul className="space-y-3">
            {openThreads.length === 0 && (
              <li className="text-sm text-muted">Inbox clear.</li>
            )}
            {openThreads.map((t) => (
              <li key={t.id} className="text-sm">
                <p className="font-semibold text-ink">{t.subject}</p>
                <p className="text-xs text-muted">
                  {t.studioName} · {t.priority}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="rounded-2xl border border-[--hair] bg-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted">Ops queue</h2>
          <Link href="/platform/tasks" className="text-xs text-brand hover:underline">
            All tasks →
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {openTasks.length === 0 && (
            <p className="text-sm text-muted">No open tasks.</p>
          )}
          {openTasks.map((t) => (
            <div key={t.id} className="rounded-xl border border-[--hair] bg-base p-4 text-sm">
              <p className="font-semibold text-ink">{t.title}</p>
              <p className="mt-1 text-xs text-muted">
                {t.priority}
                {t.dueAt && ` · due ${new Date(t.dueAt).toLocaleDateString("en-NZ")}`}
              </p>
            </div>
          ))}
        </div>
      </section>
    </motion.div>
  );
}
