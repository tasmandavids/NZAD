"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { createClass, updateClass, deleteClass, createRecurringClasses, deleteRecurringGroup } from "@/app/portal/admin/classes/actions";
import type { ClassRow, TeacherOption } from "@/app/portal/admin/classes/page";
import { formatMoney } from "@/lib/currency";

const DISCIPLINE_KEYS = [
  "ballet", "jazz", "hipHop", "contemporary", "tap", "lyrical",
  "acro", "pointe", "musicalTheatre", "ballroom", "latin", "aerial", "other",
] as const;

const DISCIPLINE_VALUES: Record<(typeof DISCIPLINE_KEYS)[number], string> = {
  ballet: "Ballet",
  jazz: "Jazz",
  hipHop: "Hip-Hop",
  contemporary: "Contemporary",
  tap: "Tap",
  lyrical: "Lyrical",
  acro: "Acro",
  pointe: "Pointe",
  musicalTheatre: "Musical Theatre",
  ballroom: "Ballroom",
  latin: "Latin",
  aerial: "Aerial",
  other: "Other",
};

const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
const DAY_SHORT_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

function fmt(time: string | null) {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "pm" : "am";
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")}${ampm}`;
}

type FormState = {
  name: string;
  discipline: string;
  level: string;
  dayOfWeek: number;
  days: number[];
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
  const t = useTranslations("admin.classes.form");
  const tShared = useTranslations("admin.shared");
  const tCommon = useTranslations("common");
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
      setError(t("pickDayError"));
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
      <motion.div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <motion.aside
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col
                   border-l border-[--hair] bg-surface shadow-2xl"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 380, damping: 38 }}
      >
        <div className="flex items-center justify-between border-b border-[--hair] px-6 py-4">
          <h2 className="font-black text-ink">
            {mode === "create" ? t("newClass") : t("editClass")}
          </h2>
          <button
            onClick={onClose}
            className="text-muted transition-colors hover:text-ink"
            aria-label={tShared("close")}
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div>
            <Label>{t("className")}</Label>
            <Input
              value={form.name}
              onChange={(v) => set("name", v)}
              placeholder={t("classNamePlaceholder")}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t("discipline")}</Label>
              <Select value={form.discipline} onChange={(v) => set("discipline", v)}>
                <option value="">{tShared("none")}</option>
                {DISCIPLINE_KEYS.map((key) => (
                  <option key={key} value={DISCIPLINE_VALUES[key]}>
                    {tShared(`disciplines.${key}`)}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>{t("level")}</Label>
              <Input
                value={form.level}
                onChange={(v) => set("level", v)}
                placeholder={t("levelPlaceholder")}
              />
            </div>
          </div>

          {mode === "edit" ? (
            <div>
              <Label>{t("dayOfWeek")}</Label>
              <Select value={form.dayOfWeek} onChange={(v) => set("dayOfWeek", Number(v))}>
                {DAY_KEYS.map((key, i) => (
                  <option key={key} value={i}>{tCommon(`days.${key}`)}</option>
                ))}
              </Select>
            </div>
          ) : (
            <div>
              <Label>{t("daysOfWeek")}</Label>
              <div className="flex flex-wrap gap-1.5">
                {DAY_SHORT_KEYS.map((key, i) => {
                  const active = form.days.includes(i);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleDay(i)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                        active
                          ? "text-white"
                          : "border border-[--hair] text-muted hover:text-ink"
                      }`}
                      style={active ? { background: "var(--brand)" } : undefined}
                    >
                      {tCommon(`days.${key}`)}
                    </button>
                  );
                })}
              </div>
              {form.days.length > 1 && (
                <p className="mt-1.5 text-[0.68rem] text-muted">
                  {t("recurringHint", { count: form.days.length })}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t("startTime")}</Label>
              <Input type="time" value={form.startTime} onChange={(v) => set("startTime", v)} />
            </div>
            <div>
              <Label>{t("endTime")}</Label>
              <Input type="time" value={form.endTime} onChange={(v) => set("endTime", v)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t("capacity")}</Label>
              <Input
                type="number"
                value={form.capacity}
                onChange={(v) => set("capacity", Number(v))}
                min={1}
                max={500}
              />
            </div>
            <div>
              <Label>{t("priceCents")}</Label>
              <Input
                type="number"
                value={form.priceCents}
                onChange={(v) => set("priceCents", Number(v))}
                min={0}
                placeholder={t("pricePlaceholder")}
              />
            </div>
          </div>

          <div>
            <Label>{t("teacher")}</Label>
            <Select value={form.teacherId} onChange={(v) => set("teacherId", v)}>
              <option value="">{tShared("unassignedOption")}</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>{teacher.name ?? teacher.email}</option>
              ))}
            </Select>
          </div>

          {error && (
            <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-400">
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-3 border-t border-[--hair] px-6 py-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-[--hair] py-2.5 text-sm text-muted
                       transition-colors hover:text-ink"
          >
            {tCommon("cancel")}
          </button>
          <button
            onClick={submit}
            disabled={pending || !form.name}
            className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white transition-opacity
                       disabled:opacity-50"
            style={{ background: "var(--brand)" }}
          >
            {pending ? tShared("saving") : mode === "create" ? t("createClass") : t("saveChanges")}
          </button>
        </div>
      </motion.aside>
    </>
  );
}

function DeleteConfirm({
  cls,
  onClose,
}: {
  cls: ClassRow;
  onClose: () => void;
}) {
  const t = useTranslations("admin.classes.delete");
  const tShared = useTranslations("admin.shared");
  const tCommon = useTranslations("common");
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
          <h3 className="font-black text-ink mb-1">{t("title", { name: cls.name })}</h3>
          <p className="text-sm text-muted mb-4">{t("description")}</p>
          {isRecurring && (
            <label className="mb-4 flex items-start gap-2 rounded-lg border border-[--hair] bg-base px-3 py-2.5 text-xs text-ink cursor-pointer">
              <input
                type="checkbox"
                checked={deleteSeries}
                onChange={(e) => setDeleteSeries(e.target.checked)}
                className="mt-0.5"
              />
              <span>{t("deleteSeries")}</span>
            </label>
          )}
          {error && <p className="mb-3 text-xs text-red-400">{error}</p>}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 rounded-xl border border-[--hair] py-2.5 text-sm text-muted hover:text-ink">
              {tCommon("cancel")}
            </button>
            <button
              onClick={confirm}
              disabled={pending}
              className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {pending
                ? tShared("deleting")
                : isRecurring && deleteSeries
                  ? t("deleteSeriesButton")
                  : tCommon("delete")}
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

function ClassRowItem({
  cls,
  onEdit,
  onDelete,
  readOnly = false,
}: {
  cls: ClassRow;
  onEdit: () => void;
  onDelete: () => void;
  readOnly?: boolean;
}) {
  const t = useTranslations("admin.classes");
  const tShared = useTranslations("admin.shared");
  const tCommon = useTranslations("common");
  const fill = cls.capacity > 0 ? cls.enrolled / cls.capacity : 0;
  const isFull = fill >= 1;

  return (
    <tr className="border-b border-[--hair] last:border-0 hover:bg-[color-mix(in_srgb,var(--brand)_3%,transparent)] transition-colors">
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
              title={t("seriesTitle")}
            >
              {t("series")}
            </span>
          )}
        </p>
        <p className="text-xs text-muted mt-0.5">
          {cls.discipline && <span>{cls.discipline}</span>}
          {cls.discipline && cls.level && <span> · </span>}
          {cls.level && <span>{cls.level}</span>}
        </p>
      </td>

      <td className="px-4 py-3 text-sm text-ink">
        <span className="font-medium">{tCommon(`days.${DAY_SHORT_KEYS[cls.dayOfWeek]}`)}</span>
        {cls.startTime && (
          <span className="ml-1 text-muted">{fmt(cls.startTime)}</span>
        )}
      </td>

      <td className="px-4 py-3 text-sm text-muted">
        {cls.teacherName ?? <span className="italic">{tShared("unassigned")}</span>}
      </td>

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

      <td className="hidden sm:table-cell px-4 py-3 text-sm tabular-nums text-muted">
        {cls.priceCents > 0 ? formatMoney(cls.priceCents) : tShared("dash")}
      </td>

      {!readOnly && (
        <td className="px-4 py-3 text-right">
          <button
            onClick={onEdit}
            className="mr-2 text-xs text-muted hover:text-ink transition-colors"
          >
            {tCommon("edit")}
          </button>
          <button
            onClick={onDelete}
            className="text-xs text-muted hover:text-red-400 transition-colors"
          >
            {tCommon("delete")}
          </button>
        </td>
      )}
    </tr>
  );
}

export default function ClassesManager({
  classes,
  teachers,
  readOnly = false,
}: {
  classes: ClassRow[];
  teachers: TeacherOption[];
  readOnly?: boolean;
}) {
  const t = useTranslations("admin.classes");

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

  const tableHeaders = [
    t("table.class"),
    t("table.schedule"),
    t("table.teacher"),
    t("table.enrolled"),
    t("table.price"),
    ...(readOnly ? [] : [""]),
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-5xl space-y-6 p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-ink">{t("title")}</h1>
          <p className="text-sm text-muted">
            {t("subtitle", { count: classes.length })}
          </p>
        </div>
        {!readOnly && (
          <button
            onClick={() => setPanel({ type: "create" })}
            className="rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--brand)" }}
          >
            {t("newClass")}
          </button>
        )}
      </div>

      <div>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="w-full max-w-sm rounded-xl border border-[--hair] bg-surface px-4 py-2.5 text-sm
                     text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-[--brand]"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-[--hair] bg-surface">
        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-muted">
              {search ? t("emptySearch") : t("empty")}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left">
              <thead>
                <tr className="border-b border-[--hair]">
                  {tableHeaders.map((h) => (
                    <th
                      key={h || "actions"}
                      className={`px-4 py-3 text-[0.62rem] font-semibold uppercase tracking-wider text-muted ${
                        !h ? "text-right" : ""
                      } ${h === t("table.price") ? "hidden sm:table-cell" : ""}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((cls) => (
                  <ClassRowItem
                    key={cls.id}
                    cls={cls}
                    readOnly={readOnly}
                    onEdit={() => setPanel({ type: "edit", cls })}
                    onDelete={() => setPanel({ type: "delete", cls })}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
