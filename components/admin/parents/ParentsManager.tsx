"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { addParent } from "@/app/portal/admin/parents/actions";
import type { ParentRow } from "@/app/portal/admin/parents/page";

function initials(name: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

function AddParentPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState({ fullName: "", email: "", phone: "" });
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await addParent(form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
      onClose();
    });
  };

  return (
    <>
      <motion.div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.aside
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-[--hair] bg-surface shadow-2xl"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 380, damping: 38 }}
      >
        <div className="flex items-center justify-between border-b border-[--hair] px-6 py-4">
          <h2 className="font-black text-ink">Add parent</h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink">
            ✕
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <div>
            <label className="mb-1 block text-[0.68rem] font-semibold uppercase tracking-wider text-muted">
              Full name *
            </label>
            <input
              value={form.fullName}
              onChange={(e) => set("fullName")(e.target.value)}
              placeholder="e.g. Sarah Johnson"
              className="w-full rounded-lg border border-[--hair] bg-base px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-[--brand]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[0.68rem] font-semibold uppercase tracking-wider text-muted">
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set("email")(e.target.value)}
              placeholder="sarah@example.com"
              className="w-full rounded-lg border border-[--hair] bg-base px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-[--brand]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[0.68rem] font-semibold uppercase tracking-wider text-muted">
              Phone
            </label>
            <input
              value={form.phone}
              onChange={(e) => set("phone")(e.target.value)}
              placeholder="+64 21 234 567"
              className="w-full rounded-lg border border-[--hair] bg-base px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-[--brand]"
            />
          </div>
          <p className="text-xs text-muted">
            Parents can sign in with their email once you send them an invite or magic link from
            Supabase Auth.
          </p>
          {error && (
            <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-400">
              {error}
            </p>
          )}
        </div>
        <div className="flex gap-3 border-t border-[--hair] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-[--hair] py-2.5 text-sm text-muted hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending || !form.fullName.trim()}
            className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-50"
            style={{ background: "var(--brand)" }}
          >
            {pending ? "Adding…" : "Add parent"}
          </button>
        </div>
      </motion.aside>
    </>
  );
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
  const [showAdd, setShowAdd] = useState(false);

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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-ink">Parents</h1>
          <p className="text-sm text-muted">
            {parents.length} parent{parents.length !== 1 ? "s" : ""} · guardians linked to students
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="rounded-xl bg-ink px-4 py-2 text-sm font-bold text-paper"
        >
          Add parent
        </button>
      </div>

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name, email, or child…"
        className="w-full max-w-sm rounded-xl border border-[--hair] bg-surface px-4 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-[--brand]"
      />

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-[--hair] bg-surface px-6 py-12 text-center">
          <p className="text-sm text-muted">
            {search
              ? "No parents match your search."
              : "No parents yet — add one or import families during setup."}
          </p>
          {!search && (
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="mt-3 text-sm font-semibold text-ink underline"
            >
              Add your first parent
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((parent) => (
            <ParentCard key={parent.id} parent={parent} />
          ))}
        </div>
      )}

      <AnimatePresence>
        {showAdd && <AddParentPanel onClose={() => setShowAdd(false)} />}
      </AnimatePresence>
    </motion.div>
  );
}
