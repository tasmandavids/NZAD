"use client";

import { useState, useTransition } from "react";
import type { AvailabilitySlot } from "@/app/portal/teacher/availability/page";
import {
  addAvailabilitySlot,
  updateAvailabilitySlot,
  deleteAvailabilitySlot,
} from "@/app/portal/teacher/availability/actions";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const EMPTY = { day_of_week: 1, start_time: "09:00", end_time: "17:00", notes: "" };

export function AvailabilityManager({ slots: initial }: { slots: AvailabilitySlot[] }) {
  const [slots, setSlots] = useState(initial);
  const [slide, setSlide] = useState<"create" | AvailabilitySlot | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const byDay = DAY_NAMES.map((name, dow) => ({
    name,
    dow,
    slots: slots.filter((s) => s.dayOfWeek === dow),
  })).filter((d) => d.dow >= 1 && d.dow <= 6); // Mon–Sat only in grid; Sunday shown if slots exist

  function openCreate(dow?: number) {
    setForm({ ...EMPTY, day_of_week: dow ?? 1 });
    setError(null);
    setSlide("create");
  }

  function openEdit(s: AvailabilitySlot) {
    setForm({ day_of_week: s.dayOfWeek, start_time: s.startTime, end_time: s.endTime, notes: s.notes ?? "" });
    setError(null);
    setSlide(s);
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const payload = { ...form, notes: form.notes || null };
      if (slide === "create") {
        const res = await addAvailabilitySlot(payload);
        if (res?.error) { setError(res.error); return; }
        location.reload();
      } else if (slide) {
        const res = await updateAvailabilitySlot(slide.id, payload);
        if (res?.error) { setError(res.error); return; }
        setSlots((prev) =>
          prev.map((s) =>
            s.id === slide.id
              ? { ...s, dayOfWeek: form.day_of_week, startTime: form.start_time, endTime: form.end_time, notes: form.notes || null }
              : s
          )
        );
        setSlide(null);
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const res = await deleteAvailabilitySlot(id);
      if (res?.error) { setError(res.error); return; }
      setSlots((prev) => prev.filter((s) => s.id !== id));
    });
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-base-content">Availability</h1>
          <p className="text-sm text-base-content/60 mt-0.5">Set when you&apos;re available to teach — studios can see this when booking</p>
        </div>
        <button onClick={() => openCreate()} className="btn-brand px-4 py-2 rounded-lg text-sm font-medium">
          + Add slot
        </button>
      </div>

      {error && <p className="text-sm text-red-500 bg-red-50 rounded p-2">{error}</p>}

      {slots.length === 0 ? (
        <div className="border-2 border-dashed border-base-300 rounded-xl p-12 text-center">
          <p className="text-base-content/50 text-sm">No availability set yet.</p>
          <button onClick={() => openCreate(1)} className="mt-3 text-sm text-brand hover:underline">
            Add your first slot
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {byDay.map(({ name, dow, slots: daySlots }) => (
            <div key={dow} className="bg-surface rounded-xl p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-base-content text-sm">{name}</p>
                <button
                  onClick={() => openCreate(dow)}
                  className="text-xs text-brand hover:underline"
                >
                  + Add
                </button>
              </div>
              {daySlots.length === 0 ? (
                <p className="text-xs text-base-content/40 italic">No slots</p>
              ) : (
                daySlots.map((s) => (
                  <div key={s.id} className="flex items-center justify-between bg-base rounded-lg px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-base-content">
                        {s.startTime} – {s.endTime}
                      </p>
                      {s.notes && <p className="text-xs text-base-content/50 mt-0.5">{s.notes}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(s)} className="text-xs text-brand hover:underline">Edit</button>
                      <button onClick={() => handleDelete(s.id)} disabled={pending} className="text-xs text-red-500 hover:underline">✕</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      )}

      {/* Slide-over */}
      {slide !== null && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSlide(null)} />
          <div className="w-full max-w-sm bg-surface shadow-xl flex flex-col">
            <div className="p-5 border-b border-base-200 flex items-center justify-between">
              <h2 className="font-semibold text-base-content">
                {slide === "create" ? "Add availability" : "Edit slot"}
              </h2>
              <button onClick={() => setSlide(null)} className="text-base-content/40 hover:text-base-content text-xl leading-none">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {error && <p className="text-sm text-red-500 bg-red-50 rounded p-2">{error}</p>}

              <label className="block space-y-1">
                <span className="text-xs font-medium text-base-content/70 uppercase tracking-wide">Day</span>
                <select
                  value={form.day_of_week}
                  onChange={(e) => setForm((f) => ({ ...f, day_of_week: +e.target.value }))}
                  className="w-full border border-base-300 rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-brand/30"
                >
                  {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                {(["start_time", "end_time"] as const).map((f) => (
                  <label key={f} className="block space-y-1">
                    <span className="text-xs font-medium text-base-content/70 uppercase tracking-wide">
                      {f === "start_time" ? "From" : "To"}
                    </span>
                    <input
                      type="time"
                      value={form[f]}
                      onChange={(e) => setForm((prev) => ({ ...prev, [f]: e.target.value }))}
                      className="w-full border border-base-300 rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-brand/30"
                    />
                  </label>
                ))}
              </div>

              <label className="block space-y-1">
                <span className="text-xs font-medium text-base-content/70 uppercase tracking-wide">Notes</span>
                <input
                  type="text"
                  placeholder="e.g. Zoom only, no travel"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full border border-base-300 rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
              </label>
            </div>
            <div className="p-5 border-t border-base-200 flex gap-3">
              <button onClick={() => setSlide(null)} className="flex-1 border border-base-300 rounded-lg py-2 text-sm">Cancel</button>
              <button
                onClick={handleSave}
                disabled={pending || form.start_time >= form.end_time}
                className="flex-1 btn-brand rounded-lg py-2 text-sm font-medium disabled:opacity-50"
              >
                {pending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
