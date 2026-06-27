export const SCHEDULE_ENTRY_TYPES = [
  "private_lesson",
  "rehearsal",
  "makeup",
  "competition",
  "event",
  "note",
  "other",
] as const;

export type ScheduleEntryType = (typeof SCHEDULE_ENTRY_TYPES)[number];

export type ScheduleEntry = {
  id: string;
  studentId: string;
  title: string;
  description: string | null;
  entryDate: string;
  startTime: string | null;
  endTime: string | null;
  entryType: ScheduleEntryType;
  locationName: string | null;
  cancelledAt: string | null;
};

export type EnrolledClassSlot = {
  classId: string;
  studentId: string;
  studentName: string | null;
  name: string;
  discipline: string | null;
  level: string | null;
  dayOfWeek: number;
  startTime: string | null;
  endTime: string | null;
  teacherName: string | null;
};

export type ClassOccurrence = EnrolledClassSlot & {
  kind: "class";
  entryDate: string;
};

export type ScheduleEntryOccurrence = ScheduleEntry & {
  kind: "entry";
  studentName: string | null;
};

export type ScheduleCalendarItem = ClassOccurrence | ScheduleEntryOccurrence;

export type ScheduleChild = {
  studentId: string;
  name: string | null;
};
