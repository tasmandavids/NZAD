// ============================================================================
//  Admin dashboard — shared types + mock data.
//  The mock lets every component render in isolation (Storybook / preview).
//  In production, page.tsx fetches the real numbers via Supabase (RLS-scoped).
// ============================================================================

export interface Stat {
  id: StatId;
  label: string;
  value: number;
  format?: "number" | "currency";
  trend?: number;
  spark?: number[];
  hint?: string;
}

export type StatId = "students" | "revenue" | "today";

/** Server-fetched metric — labels resolved on the client from i18n keys. */
export interface StatData {
  id: StatId;
  value: number;
  format?: "number" | "currency";
  trend?: number;
  spark?: number[];
}

/** A scheduled class, used by the capacity heatmap. */
export interface HeatClass {
  id: string;
  name: string;
  room: string;
  day: number;           // 0 = Mon … 5 = Sat (heatmap columns)
  slot: number;          // index into TIMES (heatmap rows)
  enrolled: number;
  capacity: number;
}

/** A draggable class block in the schedule builder. */
export interface ClassBlock {
  id: string;
  name: string;
  discipline: string;
  level: string;
  durationMin: number;
  /** DB values — null means unscheduled */
  dayOfWeek: number | null;
  startTime: string | null;  // "HH:MM"
}

export interface Room { id: string; name: string }
export interface TimeSlot { id: string; label: string }

// Schedule builder grid constants — must match slotKey encoding in ScheduleBuilder
export interface ScheduleDay { dow: number; label: string }  // dow = day_of_week in DB
export interface ScheduleSlot { id: string; label: string }  // id = "HH:MM" start_time in DB

export const SCHEDULE_DAYS: ScheduleDay[] = [
  { dow: 1, label: "Mon" },
  { dow: 2, label: "Tue" },
  { dow: 3, label: "Wed" },
  { dow: 4, label: "Thu" },
  { dow: 5, label: "Fri" },
  { dow: 6, label: "Sat" },
];

export const SCHEDULE_SLOTS: ScheduleSlot[] = [
  { id: "15:30", label: "3:30 pm" },
  { id: "16:30", label: "4:30 pm" },
  { id: "17:30", label: "5:30 pm" },
  { id: "18:30", label: "6:30 pm" },
  { id: "19:30", label: "7:30 pm" },
];

// ─────────────────────────── mock data ───────────────────────────

export const MOCK_STATS: Stat[] = [
  { id: "students", label: "Active students", value: 412, format: "number", trend: 6.2,
    spark: [320, 332, 351, 360, 372, 389, 401, 412], hint: "vs last term" },
  { id: "revenue", label: "Revenue this month", value: 38640, format: "currency", trend: 11.8,
    spark: [22, 24, 27, 29, 31, 33, 36, 38.6], hint: "NZD, paid invoices" },
  { id: "today", label: "Classes today", value: 17, format: "number", trend: 0,
    spark: [12, 15, 14, 16, 13, 17, 15, 17], hint: "across 3 studios" },
];

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const TIMES = ["15:30", "16:30", "17:30", "18:30", "19:30"];

export const MOCK_HEAT: HeatClass[] = [
  { id: "h1", name: "Ballet Jr", room: "Studio A", day: 0, slot: 0, enrolled: 14, capacity: 16 },
  { id: "h2", name: "Tap Beginners", room: "Studio B", day: 0, slot: 1, enrolled: 8, capacity: 18 },
  { id: "h3", name: "Hip-Hop Teens", room: "Studio A", day: 0, slot: 2, enrolled: 22, capacity: 22 },
  { id: "h4", name: "Contemporary", room: "Studio C", day: 0, slot: 3, enrolled: 11, capacity: 20 },
  { id: "h5", name: "Jazz Int.", room: "Studio B", day: 1, slot: 1, enrolled: 17, capacity: 20 },
  { id: "h6", name: "Pointe", room: "Studio A", day: 1, slot: 3, enrolled: 9, capacity: 12 },
  { id: "h7", name: "Acro", room: "Studio C", day: 1, slot: 2, enrolled: 19, capacity: 20 },
  { id: "h8", name: "Ballet Sr", room: "Studio A", day: 2, slot: 2, enrolled: 16, capacity: 18 },
  { id: "h9", name: "Lyrical", room: "Studio B", day: 2, slot: 1, enrolled: 6, capacity: 16 },
  { id: "h10", name: "Hip-Hop Jr", room: "Studio C", day: 2, slot: 0, enrolled: 20, capacity: 20 },
  { id: "h11", name: "Jazz Beg.", room: "Studio A", day: 3, slot: 0, enrolled: 12, capacity: 18 },
  { id: "h12", name: "Contemporary", room: "Studio B", day: 3, slot: 3, enrolled: 18, capacity: 20 },
  { id: "h13", name: "Tap Int.", room: "Studio C", day: 3, slot: 2, enrolled: 7, capacity: 16 },
  { id: "h14", name: "Ballet Jr", room: "Studio A", day: 4, slot: 1, enrolled: 15, capacity: 16 },
  { id: "h15", name: "Comp Squad", room: "Studio B", day: 4, slot: 3, enrolled: 24, capacity: 24 },
  { id: "h16", name: "Acro", room: "Studio C", day: 5, slot: 0, enrolled: 13, capacity: 20 },
  { id: "h17", name: "Open Stretch", room: "Studio A", day: 5, slot: 1, enrolled: 4, capacity: 25 },
  { id: "h18", name: "Hip-Hop Teens", room: "Studio B", day: 5, slot: 2, enrolled: 21, capacity: 22 },
];

export const ROOMS: Room[] = [
  { id: "a", name: "Studio A" },
  { id: "b", name: "Studio B" },
  { id: "c", name: "Studio C" },
];

export const SLOTS: TimeSlot[] = [
  { id: "s1", label: "3:30 pm" },
  { id: "s2", label: "4:30 pm" },
  { id: "s3", label: "5:30 pm" },
  { id: "s4", label: "6:30 pm" },
];

export const UNSCHEDULED: ClassBlock[] = [
  { id: "c1", name: "Ballet Jr", discipline: "Ballet", level: "Grade 2", durationMin: 60, dayOfWeek: null, startTime: null },
  { id: "c2", name: "Hip-Hop Teens", discipline: "Hip-Hop", level: "Teens", durationMin: 60, dayOfWeek: null, startTime: null },
  { id: "c3", name: "Contemporary", discipline: "Contemporary", level: "Open", durationMin: 75, dayOfWeek: null, startTime: null },
  { id: "c4", name: "Tap Beginners", discipline: "Tap", level: "Beginner", durationMin: 45, dayOfWeek: null, startTime: null },
  { id: "c5", name: "Jazz Int.", discipline: "Jazz", level: "Intermediate", durationMin: 60, dayOfWeek: null, startTime: null },
];

/** droppableId for a board cell. */
export const slotKey = (roomId: string, slotId: string) => `${roomId}:${slotId}`;
