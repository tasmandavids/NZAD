import type { Role } from "@/lib/types";

export type StaffPortalRole = Extract<Role, "teacher" | "office">;

export type StaffEmploymentType = "full_time" | "part_time" | "casual" | "contractor";
export type StaffWorkLocation = "on_site" | "remote" | "hybrid";

export type StaffRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: StaffPortalRole;
  employmentType: StaffEmploymentType | null;
  workLocation: StaffWorkLocation | null;
  locationNames: string[];
  scheduleNotes: string | null;
  contractNotes: string | null;
  payNotes: string | null;
  managerId: string | null;
  managerName: string | null;
  startDate: string | null;
  endDate: string | null;
  active: boolean;
  createdAt: string;
};

export type StaffDetail = StaffRow;

export type StaffOption = {
  id: string;
  name: string | null;
  role: StaffPortalRole | "admin";
};

export type StaffShift = {
  id: string;
  staffId: string;
  staffName: string | null;
  staffRole: StaffPortalRole;
  shiftDate: string;
  startTime: string;
  endTime: string;
  locationName: string | null;
  notes: string | null;
};

export type TeachingBlock = {
  id: string;
  staffId: string;
  staffName: string | null;
  className: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string | null;
  room: string | null;
};

export const EMPLOYMENT_TYPES: StaffEmploymentType[] = [
  "full_time",
  "part_time",
  "casual",
  "contractor",
];

export const WORK_LOCATIONS: StaffWorkLocation[] = ["on_site", "remote", "hybrid"];

export const STAFF_PORTAL_ROLES: StaffPortalRole[] = ["teacher", "office"];
