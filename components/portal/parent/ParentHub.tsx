"use client";

// ============================================================================
//  ParentHub — presentation layer for the parent portal.
//  Sections:
//    1.  Children cards — each child + their enrolled classes as chips
//    2.  Invoices table — amount, status badge, due date, dancer name
// ============================================================================

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Child, Invoice } from "@/app/portal/parent/page";
import { EnrollModal } from "./EnrollModal";

const NZD = new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 2 });
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function fmt(time: string | null) {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "pm" : "am";
  return `${h % 12 || 12}${m ? `:${m.toString().padStart(2, "0")}` : ""}${ampm}`;
}

const STATUS_STYLES: Record<string, { label: string; color: string }> = {
  paid:    { label: "Paid",    color: "color-mix(in srgb, #22c55e 70%, transparent)" },
  sent:    { label: "Sent",    color: "color-mix(in srgb, var(--brand-hot) 70%, transparent)" },
  overdue: { label: "Overdue", color: "color-mix(in srgb, #ef4444 70%, transparent)" },
  draft:   { label: "Draft",   color: "color-mix(in srgb, var(--muted) 70%, transparent)" },
  void:    { label: "Void",    color: "color-mix(in srgb, var(--muted) 40%, transparent)" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? { label: status, color: "var(--muted)" };
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.62rem] font-semibold uppercase tracking-wider text-white"
      style={{ background: s.color }}
    >
      {s.label}
    </span>
  );
}

export default function ParentHub({
  parentName,
  children,
  invoices,
}: {
  parentName: string | null;
  children: Child[];
  invoices: Invoice[];
}) {
  const [showEnroll, setShowEnroll] = useState(false);
  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  })();

  const outstanding = invoices
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .reduce((sum, i) => sum + i.amountCents, 0);

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
          <p className="text-sm text-muted">
            {greeting}{parentName ? `, ${parentName.split(" ")[0]}` : ""}.
          </p>
          <h1 className="text-2xl font-black tracking-tight text-ink">Family Hub</h1>
        </div>
        <div className="flex items-center gap-3">
          {outstanding > 0 && (
            <div className="rounded-xl border border-[--hair] bg-surface px-4 py-2 text-right">
              <p className="text-xs text-muted">Outstanding</p>
              <p className="text-lg font-black" style={{ color: "var(--brand-hot)" }}>
                {NZD.format(outstanding / 100)}
              </p>
            </div>
          )}
          {children.length > 0 && (
            <button
              type="button"
              onClick={() => setShowEnroll(true)}
              className="rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90"
              style={{ background: "var(--brand)" }}
            >
              + Enroll
            </button>
          )}
        </div>
      </motion.header>

      {/* Children */}
      <motion.section
        variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
      >
        <h2 className="mb-3 text-xs uppercase tracking-widest text-muted">
          Your dancers · {children.length}
        </h2>
        {children.length === 0 ? (
          <div className="rounded-2xl border border-[--hair] bg-surface px-6 py-10 text-center">
            <p className="text-sm text-muted">No children linked to this account yet.</p>
            <p className="mt-1 text-xs text-muted">Your studio admin will link your dancer(s) to you.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {children.map((child) => (
              <motion.div
                key={child.studentId}
                whileHover={{ y: -2 }}
                className="rounded-2xl border border-[--hair] bg-surface p-5"
              >
                {/* Avatar + name */}
                <div className="mb-4 flex items-center gap-3">
                  <span
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-black text-white"
                    style={{ background: "var(--brand)" }}
                  >
                    {child.name?.[0]?.toUpperCase() ?? "?"}
                  </span>
                  <div>
                    <p className="font-bold text-ink">{child.name ?? "Unnamed dancer"}</p>
                    <p className="text-xs text-muted">
                      {child.classes.length} class{child.classes.length !== 1 ? "es" : ""} enrolled
                    </p>
                  </div>
                </div>

                {/* Class chips */}
                {child.classes.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {child.classes.map((c) => (
                      <span
                        key={c.id}
                        className="rounded-full border border-[--hair] px-2.5 py-1 text-[0.65rem] font-medium text-ink"
                        title={`${DAY_SHORT[c.dayOfWeek]}${c.startTime ? ` · ${fmt(c.startTime)}` : ""}`}
                      >
                        {c.name}
                        {c.level ? ` · ${c.level}` : ""}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted">No active enrolments.</p>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </motion.section>

      {/* Invoices */}
      <motion.section
        variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
      >
        <h2 className="mb-3 text-xs uppercase tracking-widest text-muted">
          Invoices · {invoices.length}
        </h2>
        {invoices.length === 0 ? (
          <div className="rounded-2xl border border-[--hair] bg-surface px-6 py-10 text-center">
            <p className="text-sm text-muted">No invoices found.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[--hair] bg-surface">
            <table className="w-full min-w-[400px] text-sm">
              <thead>
                <tr className="border-b border-[--hair]">
                  {["Dancer", "Amount", "Status", "Due"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-[0.62rem] font-semibold uppercase tracking-wider text-muted"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv, i) => (
                  <tr
                    key={inv.id}
                    className={`border-b border-[--hair] last:border-0 ${
                      inv.status === "overdue" ? "bg-[color-mix(in_srgb,#ef4444_4%,transparent)]" : ""
                    }`}
                  >
                    <td className="px-4 py-3 text-ink">
                      {inv.studentName ?? <span className="text-muted">—</span>}
                    </td>
                    <td className="px-4 py-3 font-semibold tabular-nums text-ink">
                      {NZD.format(inv.amountCents / 100)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {inv.dueDate
                        ? new Date(inv.dueDate).toLocaleDateString("en-NZ", { day: "numeric", month: "short" })
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-xs text-muted">
          Payments are processed by your studio. Contact them for billing queries.
        </p>
      </motion.section>

      {/* Enroll modal */}
      <AnimatePresence>
        {showEnroll && (
          <EnrollModal children={children} onClose={() => setShowEnroll(false)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
