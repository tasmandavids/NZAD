"use client";

import type { TeacherAvailabilityRow } from "@/app/portal/admin/availability/page";

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon–Sat–Sun

function formatTime(t: string) {
  // "HH:MM:SS" → "9:00 am"
  const [h, m] = t.split(":").map(Number);
  const ampm = h < 12 ? "am" : "pm";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

const DAY_ABBR: Record<number, string> = {
  0: "Sun", 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat",
};

export function AdminAvailabilityView({ rows }: { rows: TeacherAvailabilityRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-xl font-semibold text-gray-900">Teacher availability</h1>
        <p className="text-sm text-gray-400 mt-6">No teachers or availability slots on record yet.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Teacher availability</h1>
        <p className="text-sm text-gray-500 mt-0.5">Read-only view of slots teachers have marked as available</p>
      </div>

      <div className="space-y-3">
        {rows.map((teacher) => (
          <div key={teacher.teacherId} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900">{teacher.teacherName}</p>
              {teacher.slots.length === 0 && (
                <span className="text-xs text-gray-400">No availability set</span>
              )}
            </div>
            {teacher.slots.length > 0 && (
              <div className="px-4 py-3 flex flex-wrap gap-2">
                {DAY_ORDER.flatMap((day) =>
                  teacher.slots
                    .filter((s) => s.day === day)
                    .map((slot, i) => (
                      <div
                        key={`${day}-${i}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg"
                      >
                        <span className="text-xs font-semibold text-indigo-700">{DAY_ABBR[day]}</span>
                        <span className="text-xs text-indigo-600">
                          {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
                        </span>
                        {slot.notes && (
                          <span className="text-xs text-indigo-400 truncate max-w-[120px]" title={slot.notes}>
                            · {slot.notes}
                          </span>
                        )}
                      </div>
                    ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
