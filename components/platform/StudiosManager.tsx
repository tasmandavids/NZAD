"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import type { PlatformStudioSummary } from "@/lib/platform/types";
import { updateStudioStatus } from "@/app/platform/studios/actions";

const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "olune.app";

export function StudiosManager({ studios }: { studios: PlatformStudioSummary[] }) {
  const [filter, setFilter] = useState<string>("all");
  const [pending, startTransition] = useTransition();
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const filtered =
    filter === "all" ? studios : studios.filter((s) => s.status === filter);

  function setStatus(studioId: string, status: string) {
    startTransition(async () => {
      const res = await updateStudioStatus({ studioId, status });
      setStatusMsg(res.ok ? "Updated" : res.error);
      setTimeout(() => setStatusMsg(null), 2000);
    });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-black text-ink">Studios</h1>
        <p className="text-sm text-muted">All tenants on the Olune platform.</p>
      </header>

      <div className="flex flex-wrap gap-2">
        {["all", "trial", "active", "suspended"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
              filter === f ? "bg-brand text-white" : "border border-[--hair] text-muted hover:text-ink"
            }`}
          >
            {f}
          </button>
        ))}
        {statusMsg && <span className="self-center text-xs text-muted">{statusMsg}</span>}
      </div>

      <motion.div layout className="overflow-x-auto rounded-2xl border border-[--hair] bg-surface">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-[--hair] text-xs uppercase tracking-widest text-muted">
              <th className="p-4">Studio</th>
              <th className="p-4">Owner</th>
              <th className="p-4">Students</th>
              <th className="p-4">Status</th>
              <th className="p-4">Joined</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} className="border-b border-[--hair]/60 last:border-0">
                <td className="p-4">
                  <p className="font-semibold text-ink">{s.name}</p>
                  <p className="text-xs text-muted">
                    {s.slug}.{ROOT}
                    {s.customDomain && ` · ${s.customDomain}`}
                  </p>
                </td>
                <td className="p-4">
                  <p className="text-ink">{s.ownerName ?? "—"}</p>
                  <p className="text-xs text-muted">{s.ownerEmail ?? ""}</p>
                </td>
                <td className="p-4 text-ink">{s.studentCount}</td>
                <td className="p-4">
                  <span className="rounded-full bg-base px-2 py-0.5 text-[0.65rem] uppercase tracking-wide">
                    {s.status}
                  </span>
                </td>
                <td className="p-4 text-muted">
                  {new Date(s.createdAt).toLocaleDateString("en-NZ")}
                </td>
                <td className="p-4">
                  <select
                    disabled={pending}
                    value={s.status}
                    onChange={(e) => setStatus(s.id, e.target.value)}
                    className="rounded-lg border border-[--hair] bg-base px-2 py-1 text-xs"
                  >
                    <option value="trial">trial</option>
                    <option value="active">active</option>
                    <option value="suspended">suspended</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="p-8 text-center text-sm text-muted">No studios match this filter.</p>
        )}
      </motion.div>
    </div>
  );
}
