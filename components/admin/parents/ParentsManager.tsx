"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { ParentRow } from "@/app/portal/admin/parents/page";

function initials(name: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

function ParentCard({ parent }: { parent: ParentRow }) {
  return (
    <div className="rounded-2xl border border-[--hair] bg-surface p-4 text-left">
      <div className="mb-3 flex items-center gap-3">
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-black text-white"
          style={{ background: "var(--brand)" }}
        >
          {initials(parent.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-ink">{parent.name ?? "Unknown"}</p>
          <p className="truncate text-xs text-muted">
            {parent.email ?? parent.phone ?? "No contact"}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {parent.children.length === 0 ? (
          <span className="text-xs italic text-muted">No linked students</span>
        ) : (
          parent.children.map((child) => (
            <span
              key={child.id}
              className="rounded-full border border-[--hair] px-2 py-0.5 text-[0.62rem] font-medium text-ink"
            >
              {child.name ?? "Student"}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

export default function ParentsManager({ parents }: { parents: ParentRow[] }) {
  const [search, setSearch] = useState("");

  const filtered = parents.filter(
    (p) =>
      !search ||
      (p.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (p.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
      p.children.some((c) => (c.name ?? "").toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-5xl space-y-6 p-6"
    >
      <div>
        <h1 className="text-2xl font-black text-ink">Parents</h1>
        <p className="text-sm text-muted">
          {parents.length} parent{parents.length !== 1 ? "s" : ""} · guardians linked to students
        </p>
      </div>

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name, email, or child…"
        className="w-full max-w-sm rounded-xl border border-[--hair] bg-surface px-4 py-2.5 text-sm
                   text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-[--brand]"
      />

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-[--hair] bg-surface px-6 py-12 text-center">
          <p className="text-sm text-muted">
            {search ? "No parents match your search." : "No parents yet — they appear when families sign up or are imported."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((parent) => (
            <ParentCard key={parent.id} parent={parent} />
          ))}
        </div>
      )}
    </motion.div>
  );
}
