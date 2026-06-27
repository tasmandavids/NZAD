import type {
  ClassOccurrence,
  EnrolledClassSlot,
  ScheduleCalendarItem,
  ScheduleEntry,
} from "./schedule-types";
import { getWeekRange } from "@/lib/staff/week";

export function expandClassesToWeek(
  classes: EnrolledClassSlot[],
  weekDates: string[],
): ClassOccurrence[] {
  const out: ClassOccurrence[] = [];
  for (const date of weekDates) {
    const dow = new Date(`${date}T12:00:00`).getDay();
    for (const cls of classes) {
      if (cls.dayOfWeek !== dow) continue;
      out.push({ ...cls, kind: "class", entryDate: date });
    }
  }
  return out;
}

export function mergeScheduleItems(
  classes: EnrolledClassSlot[],
  entries: ScheduleEntry[],
  weekDates: string[],
): ScheduleCalendarItem[] {
  const classItems = expandClassesToWeek(classes, weekDates);
  const entryItems = entries
    .filter((e) => weekDates.includes(e.entryDate) && !e.cancelledAt)
    .map(
      (e): ScheduleCalendarItem => ({
        ...e,
        kind: "entry",
        studentName: null,
      }),
    );
  return [...classItems, ...entryItems].sort((a, b) => {
    if (a.entryDate !== b.entryDate) return a.entryDate.localeCompare(b.entryDate);
    const aTime = "startTime" in a ? a.startTime : null;
    const bTime = "startTime" in b ? b.startTime : null;
    return (aTime ?? "").localeCompare(bTime ?? "");
  });
}

export function itemsForDate(items: ScheduleCalendarItem[], date: string) {
  return items.filter((item) => item.entryDate === date);
}

export function parseWeekStart(searchParams: { week?: string } | undefined): string {
  const raw = searchParams?.week;
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return getWeekRange().weekStart;
}
