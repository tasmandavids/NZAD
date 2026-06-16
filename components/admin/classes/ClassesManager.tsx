"use client";

// ============================================================================
//  ClassesManager — admin class roster + create/edit slide-over.
//  Receives pre-fetched classes + teacher options as props; all mutations go
//  through server actions (createClass / updateClass / deleteClass).
// ============================================================================

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createClass, updateClass, deleteClass, createRecurringClasses, deleteRecurringGroup } from "@/app/portal/admin/classes/actions";
import type { ClassRow, TeacherOption } from "@/app/portal/admin/classes/page";
import { formatMoney } from "@/lib/currency";

// ─── constants ───────────────────────────────────────────────────────────────

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DISCIPLINES = [
  "Ballet", "Jazz", "Hip-Hop", "Contemporary", "Tap", "Lyrical",
  "Acro", "Pointe", "Musical Theatre", "Ballroom", "Latin", "Aerial", "Other",
];

function fmt(time: string | null) {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "pm" : "am";
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")}${ampm}`;
}

// ─── form state ──────────────────────────────────────────────────────────────

type FormState = {
  name: string;
  discipline: string;
  level: string;
  dayOfWeek: number;
  days: number[];        // create mode: one or more weekdays (recurring group)
  startTime: string;
  endTime: string;
  capacity: number;
  priceCents: number;
  teacherId: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  discipline: "",
  level: "",
  dayOfWeek: 1,
  days: [1],
  startTime: "16:00",
  endTime: "17:00",
  capacity: 20,
  priceCents: 0,
  teacherId: "",
};

function formFromClass(c: ClassRow): FormState {
  return {
    name:       c.name,
    discipline: c.discipline ?? "",
    level:      c.level ?? "",
    dayOfWeek:  c.dayOfWeek,
    days:       [c.dayOfWeek],
    startTime:  c.startTime?.slice(0, 5) ?? "",
    endTime:    c.endTime?.slice(0, 5) ?? "",
    capacity:   c.capacity,
    priceCents: c.priceCents,
    teacherId:  c.teacherId ?? "",
  };
}

// ─── sub-components ──────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[0.68rem] font-semibold uppercase tracking-wider text-muted mb-1">
      {children}
    </label>
  );
}

function Input({
  value, onChange, type = "text", placeholder, min, max,
}: {
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  min?: number;
  max?: number;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      min={min}
      max={max}
      className="w-full rounded-lg border border-[--hair] bg-base px-3 py-2 text-sm text-ink
                 placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-[--brand]"
    />
  );
}

function Select({
  value, onChange, children,
}: {
  value: string | number;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-[--hair] bg-base px-3 py-2 text-sm text-ink
                 focus:outline-none focus:ring-1 focus:ring-[--brand]"
    >
      {children}
    </select>
  );
}

// ─── slide-over panel ────────────────────────────────────────────────────────

function ClassSlideOver({
  mode,
  editing,
  teachers,
  onClose,
}: {
  mode: "create" | "edit";
  editing: ClassRow | null;
  teachers: TeacherOption[];
  onClose: () => void;
}) {
  const [form, setForm] = useState<FormState>(
    mode === "edit" && editing ? formFromClass(editing) : EMPTY_FORM,
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const toggleDay = (day: number) =>
    setForm((prev) => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter((d) => d !== day)
        : [...prev.days, day].sort((a, b) => a - b),
    }));

  const submit = () => {
    setError(null);
    const base = {
      name:       form.name,
      discipline: form.discipline,
      level:      form.level,
      startTime:  form.startTime || undefined,
      endTime:    form.endTime || undefined,
      capacity:   form.capacity,
      priceCents: form.priceCents,
      teacherId:  form.teacherId || undefined,
    };

    if (mode === "create" && form.days.length === 0) {
      setError("Pick at least one day.");
      return;
    }

    startTransition(async () => {
      let result;
      if (mode === "edit" && editing) {
        result = await updateClass(editing.id, { ...base, dayOfWeek: form.dayOfWeek });
      } else if (form.days.length > 1) {
        result = await createRecurringClasses({ ...base, days: form.days });
      } else {
        result = await createClass({ ...base, dayOfWeek: form.days[0] });
      }

      if (!result.ok) { setError(result.error); return; }
      onClose();
    });
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Panel */}
      <motion.aside
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col
                   border-l border-[--hair] bg-surface shadow-2xl"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 380, damping: 38 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[--hair] px-6 py-4">
          <h2 className="font-black text-ink">
            {mode === "create" ? "New class" : "Edit class"}
          </h2>
          <button
            onClick={onClose}
            className="text-muted transition-colors hover:text-ink"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Form body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Name */}
          <div>
            <Label>Class name *</Label>
            <Input
              value={form.name}
              onChange={(v) => set("name", v)}
              placeholder="e.g. Ballet Junior"
            />
          </div>

          {/* Discipline + Level */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Discipline</Label>
              <Select value={form.discipline} onChange={(v) => set("discipline", v)}>
                <option value="">— none —</option>
                {DISCIPLINES.map((d) => <option key={d} value={d}>{d}</option>)}
              </Select>
            </div>
            <div>
              <Label>Level / Age group</Label>
              <Input
                value={form.level}
                onChange={(v) => set("level", v)}
                placeholder="e.g. Grade 2"
              />
            </div>
          </div>

          {/* Day(s) */}
          {mode === "edit" ? (
            <div>
              <Label>Day of week</Label>
              <Select value={form.dayOfWeek} onChange={(v) => set("dayOfWeek", Number(v))}>
                {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </Select>
            </div>
          ) : (
            <div>
              <Label>Day(s) of week</Label>
              <div className="flex flex-wrap gap-1.5">
                {DAY_SHORT.map((d, i) => {
                  const active = form.days.includes(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleDay(i)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                        active
                          ? "text-white"
                          : "border border-[--hair] text-muted hover:text-ink"
                      }`}
                      style={active ? { background: "var(--brand)" } : undefined}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
              {form.days.length > 1 && (
                <p className="mt-1.5 text-[0.68rem] text-muted">
                  Creates {form.days.length} linked weekly classes (one per day).
                </p>
              )}
            </div>
          )}

          {/* Start / End time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start time</Label>
              <Input type="time" value={form.startTime} onChange={(v) => set("startTime", v)} />
            </div>
            <div>
              <Label>End time</Label>
              <Input type="time" value={form.endTime} onChange={(v) => set("endTime", v)} />
            </div>
          </div>

          {/* Capacity + Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Capacity</Label>
              <Input
                type="number"
                value={form.capacity}
                onChange={(v) => set("capacity", Number(v))}
                min={1}
                max={500}
              />
            </div>
            <div>
              <Label>Price (cents NZD)</Label>
              <Input
                type="number"
                value={form.priceCents}
                onChange={(v) => set("priceCents", Number(v))}
                min={0}
                placeholder="e.g. 2000 = $20"
              />
            </div>
          </div>

          {/* Teacher */}
          <div>
            <Label>Teacher</Label>
            <Select value={form.teacherId} onChange={(v) => set("teacherId", v)}>
              <option value="">— unassigned —</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>{t.name ?? t.email}</option>
              ))}
            </Select>
          </div>

          {error && (
            <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-400">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-[--hair] px-6 py-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-[--hair] py-2.5 text-sm text-muted
                       transition-colors hover:text-ink"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={pending || !form.name}
            className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white transition-opacity
                       disabled:opacity-50"
            style={{ background: "var(--brand)" }}
          >
            {pending ? "Saving…" : mode === "create" ? "Create class" : "Save changes"}
          </button>
        </div>
      </motion.aside>
    </>
  );
}

// ─── delete confirm ──────────────────────────────────────────────────────────

function DeleteConfirm({
  cls,
  onClose,
}: {
  cls: ClassRow;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [deleteSeries, setDeleteSeries] = useState(false);
  const isRecurring = Boolean(cls.recurringGroupId);

  const confirm = () => {
    startTransition(async () => {
      const result =
        isRecurring && deleteSeries
          ? await deleteRecurringGroup(cls.recurringGroupId as string)
          : await deleteClass(cls.id);
      if (!result.ok) { setError(result.error); return; }
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
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
      >
        <div className="w-full max-w-sm rounded-2xl border border-[--hair] bg-surface p-6 shadow-2xl">
          <h3 className="font-black text-ink mb-1">Delete "{cls.name}"?</h3>
          <p className="text-sm text-muted mb-4">
            This will remove the class and all its enrollment records. This cannot be undone.
          </p>
          {isRecurring && (
            <label className="mb-4 flex items-start gap-2 rounded-lg border border-[--hair] bg-base px-3 py-2.5 text-xs text-ink cursor-pointer">
              <input
                type="checkbox"
                checked={deleteSeries}
                onChange={(e) => setDeleteSeries(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                Delete the <strong>entire recurring series</strong> (every weekday in this group),
                not just this one class.
              </span>
            </label>
          )}
          {error && <p className="mb-3 text-xs text-red-400">{error}</p>}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 rounded-xl border border-[--hair] py-2.5 text-sm text-muted hover:text-ink">
              Cancel
            </button>
            <button
              onClick={confirm}
              disabled={pending}
              className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {pending ? "Deleting…" : isRecurring && deleteSeries ? "Delete series" : "Delete"}
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ─── class row ───────────────────────────────────────────────────────────────

function ClassRow({
  cls,
  onEdit,
  onDelete,
}: {
  cls: ClassRow;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const fill = cls.capacity > 0 ? cls.enrolled / cls.capacity : 0;
  const isFull = fill >= 1;

  return (
    <tr className="border-b border-[--hair] last:border-0 hover:bg-[color-mix(in_srgb,var(--brand)_3%,transparent)] transition-colors">
      {/* Name + meta */}
      <td className="px-4 py-3">
        <p className="flex items-center gap-2 font-semibold text-ink text-sm">
          {cls.name}
          {cls.recurringGroupId && (
            <span
              className="rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider"
              style={{
                color: "var(--brand)",
                background: "color-mix(in srgb, var(--brand) 12%, transparent)",
              }}
              title="Part of a recurring weekly series"
            >
              ↻ Series
            </span>
          )}
        </p>
        <p className="text-xs text-muted mt-0.5">
          {cls.discipline && <span>{cls.discipline}</span>}
          {cls.discipline && cls.level && <span> · </span>}
          {cls.level && <span>{cls.level}</span>}
        </p>
      </td>

      {/* Day + time */}
      <td className="px-4 py-3 text-sm text-ink">
        <span className="font-medium">{DAY_SHORT[cls.dayOfWeek]}</span>
        {cls.startTime && (
          <span className="ml-1 text-muted">{fmt(cls.startTime)}</span>
        )}
      </td>

      {/* Teacher */}
      <td className="px-4 py-3 text-sm text-muted">
        {cls.teacherName ?? <span className="italic">Unassigned</span>}
      </td>

      {/* Capacity */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-semibold tabular-nums ${isFull ? "text-red-400" : "text-ink"}`}
          >
            {cls.enrolled}/{cls.capacity}
          </span>
          <div className="hidden sm:block h-1.5 w-16 rounded-full bg-[--hair] overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(fill * 100, 100)}%`,
                background: isFull ? "#ef4444" : "var(--brand)",
              }}
            />
          </div>
        </div>
      </td>

      {/* Price */}
      <td className="hidden sm:table-cell px-4 py-3 text-sm tabular-nums text-muted">
        {cls.priceCents > 0 ? formatMoney(cls.priceCents) : "—"}
      </td>

      {/* Actions */}
      <td className="px-4 py-3 text-right">
        <button
          onClick={onEdit}
          className="mr-2 text-xs text-muted hover:text-ink transition-colors"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          className="text-xs text-muted hover:text-red-400 transition-colors"
        >
          Delete
        </button>
      </td>
    </tr>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

export default function ClassesManager({
  classes,
  teachers,
}: {
  classes: ClassRow[];
  teachers: TeacherOption[];
}) {
  type Panel =
    | { type: "create" }
    | { type: "edit"; cls: ClassRow }
    | { type: "delete"; cls: ClassRow }
    | null;

  const [panel, setPanel] = useState<Panel>(null);
  const [search, setSearch] = useState("");

  const filtered = classes.filter(
    (c) =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.discipline ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (c.level ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-5xl space-y-6 p-6"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-ink">Classes</h1>
          <p className="text-sm text-muted">
            {classes.length} class{classes.length !== 1 ? "es" : ""} · manage your timetable
          </p>
        </div>
        <button
          onClick={() => setPanel({ type: "create" })}
          className="rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
          style={{ background: "var(--brand)" }}
        >
          + New class
        </button>
      </div>

      {/* Search */}
      <div>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, discipline or level…"
          className="w-full max-w-sm rounded-xl border border-[--hair] bg-surface px-4 py-2.5 text-sm
                     text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-[--brand]"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-[--hair] bg-surface">
        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-muted">
              {search ? "No classes match your search." : "No classes yet — create your first one above."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left">
              <thead>
                <tr className="border-b border-[--hair]">
                  {["Class", "Schedule", "Teacher", "Enrolled", "Price", ""].map((h) => (
                    <th
                      key={h}
                      className={`px-4 py-3 text-[0.62rem] font-semibold uppercase tracking-wider text-muted ${
                        !h ? "text-right" : ""
                      } ${h === "Price" ? "hidden sm:table-cell" : ""}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((cls) => (
                  <ClassRow
                    key={cls.id}
                    cls={cls}
                    onEdit={() => setPanel({ type: "edit", cls })}
                    onDelete={() => setPanel({ type: "delete", cls })}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Panels */}
      <AnimatePresence>
        {(panel?.type === "create" || panel?.type === "edit") && (
          <ClassSlideOver
            mode={panel.type}
            editing={panel.type === "edit" ? panel.cls : null}
            teachers={teachers}
            onClose={() => setPanel(null)}
          />
        )}
        {panel?.type === "delete" && (
          <DeleteConfirm cls={panel.cls} onClose={() => setPanel(null)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
