export type StudioScheduleClass = {
  id: string;
  name: string;
  discipline: string | null;
  level: string | null;
  stream: string | null;
  room: string | null;
  dayOfWeek: number;
  startTime: string | null;
  endTime: string | null;
  priceCents: number;
  teacherName: string | null;
};

/** Mon → Sun column order; dow matches JS Date.getDay() / DB day_of_week. */
export const STUDIO_SCHEDULE_DAYS = [
  { dow: 1, key: "mon" },
  { dow: 2, key: "tue" },
  { dow: 3, key: "wed" },
  { dow: 4, key: "thu" },
  { dow: 5, key: "fri" },
  { dow: 6, key: "sat" },
  { dow: 0, key: "sun" },
] as const;

export function classesByDay(classes: StudioScheduleClass[]): Map<number, StudioScheduleClass[]> {
  const map = new Map<number, StudioScheduleClass[]>();
  for (const { dow } of STUDIO_SCHEDULE_DAYS) {
    map.set(dow, []);
  }
  for (const cls of classes) {
    const list = map.get(cls.dayOfWeek);
    if (list) list.push(cls);
  }
  for (const list of map.values()) {
    list.sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""));
  }
  return map;
}
