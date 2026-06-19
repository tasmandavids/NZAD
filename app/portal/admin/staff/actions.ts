"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminStudio } from "@/lib/portal/access";
import type {
  StaffEmploymentType,
  StaffPortalRole,
  StaffWorkLocation,
} from "@/lib/staff/types";
import {
  EMPLOYMENT_TYPES,
  STAFF_PORTAL_ROLES,
  WORK_LOCATIONS,
} from "@/lib/staff/types";

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

const STAFF_PATHS = ["/portal/admin/staff", "/portal/office"];

function revalidateStaffPaths(staffId?: string) {
  for (const path of STAFF_PATHS) revalidatePath(path);
  if (staffId) revalidatePath(`/portal/admin/staff/${staffId}`);
}

const StaffRoleSchema = z.enum(STAFF_PORTAL_ROLES as [StaffPortalRole, StaffPortalRole]);
const EmploymentSchema = z.enum(EMPLOYMENT_TYPES as [StaffEmploymentType, ...StaffEmploymentType[]]).optional().nullable();
const WorkLocationSchema = z.enum(WORK_LOCATIONS as [StaffWorkLocation, ...StaffWorkLocation[]]).optional().nullable();

const CreateStaffSchema = z.object({
  fullName: z.string().min(1, "Name is required").max(120),
  email: z.string().email("Valid email required"),
  phone: z.string().max(30).optional().or(z.literal("")),
  role: StaffRoleSchema,
  employmentType: EmploymentSchema,
  workLocation: WorkLocationSchema,
  locationNames: z.array(z.string()).default([]),
  scheduleNotes: z.string().max(2000).optional().or(z.literal("")),
  contractNotes: z.string().max(2000).optional().or(z.literal("")),
  payNotes: z.string().max(2000).optional().or(z.literal("")),
  managerId: z.string().uuid().optional().nullable().or(z.literal("")),
  startDate: z.string().optional().nullable().or(z.literal("")),
});

const UpdateStaffSchema = CreateStaffSchema.extend({
  id: z.string().uuid(),
  active: z.boolean().optional(),
  endDate: z.string().optional().nullable().or(z.literal("")),
}).omit({ email: true });

const UpdateProfileSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().min(1).max(120),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
  role: StaffRoleSchema,
});

const ShiftSchema = z.object({
  staffId: z.string().uuid(),
  shiftDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  endTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  locationName: z.string().max(120).optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
});

function normalizeTime(t: string): string {
  return t.length === 5 ? `${t}:00` : t;
}

export async function createStaffMember(
  input: z.infer<typeof CreateStaffSchema>,
): Promise<ActionResult> {
  const { error, studioId } = await getAdminStudio();
  if (error || !studioId) return { ok: false, error: error ?? "No studio." };

  const parsed = CreateStaffSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const data = parsed.data;

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("studio_id", studioId)
    .eq("email", data.email)
    .maybeSingle();
  if (existing) return { ok: false, error: `A user with email ${data.email} already exists.` };

  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email: data.email,
    email_confirm: true,
    user_metadata: { full_name: data.fullName },
  });
  if (authErr) return { ok: false, error: authErr.message };

  const userId = authData.user.id;
  const managerId = data.managerId && data.managerId !== "" ? data.managerId : null;

  const { error: profileErr } = await admin.from("profiles").upsert({
    id: userId,
    studio_id: studioId,
    role: data.role,
    full_name: data.fullName,
    email: data.email,
    phone: data.phone || null,
  });
  if (profileErr) return { ok: false, error: profileErr.message };

  const { error: memberErr } = await admin.from("staff_members").insert({
    profile_id: userId,
    studio_id: studioId,
    employment_type: data.employmentType ?? null,
    work_location: data.workLocation ?? null,
    location_names: data.locationNames,
    schedule_notes: data.scheduleNotes || null,
    contract_notes: data.contractNotes || null,
    pay_notes: data.payNotes || null,
    manager_id: managerId,
    start_date: data.startDate || null,
    active: true,
  });
  if (memberErr) return { ok: false, error: memberErr.message };

  revalidateStaffPaths(userId);
  return { ok: true, id: userId };
}

export async function updateStaffMember(
  input: z.infer<typeof UpdateStaffSchema>,
): Promise<ActionResult> {
  const { error, studioId } = await getAdminStudio();
  if (error || !studioId) return { ok: false, error: error ?? "No studio." };

  const parsed = UpdateStaffSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const data = parsed.data;

  const admin = createAdminClient();
  const managerId = data.managerId && data.managerId !== "" ? data.managerId : null;

  const { error: profileErr } = await admin
    .from("profiles")
    .update({
      full_name: data.fullName,
      phone: data.phone || null,
      role: data.role,
    })
    .eq("id", data.id)
    .eq("studio_id", studioId)
    .in("role", ["teacher", "office"]);
  if (profileErr) return { ok: false, error: profileErr.message };

  const { error: memberErr } = await admin.from("staff_members").upsert({
    profile_id: data.id,
    studio_id: studioId,
    employment_type: data.employmentType ?? null,
    work_location: data.workLocation ?? null,
    location_names: data.locationNames,
    schedule_notes: data.scheduleNotes || null,
    contract_notes: data.contractNotes || null,
    pay_notes: data.payNotes || null,
    manager_id: managerId,
    start_date: data.startDate || null,
    end_date: data.endDate || null,
    active: data.active ?? true,
  });
  if (memberErr) return { ok: false, error: memberErr.message };

  revalidateStaffPaths(data.id);
  return { ok: true, id: data.id };
}

export async function updateStaffProfile(
  input: z.infer<typeof UpdateProfileSchema>,
): Promise<ActionResult> {
  const { error, studioId } = await getAdminStudio();
  if (error || !studioId) return { ok: false, error: error ?? "No studio." };

  const parsed = UpdateProfileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const data = parsed.data;

  const admin = createAdminClient();
  const { error: profileErr } = await admin
    .from("profiles")
    .update({
      full_name: data.fullName,
      phone: data.phone || null,
      role: data.role,
    })
    .eq("id", data.id)
    .eq("studio_id", studioId)
    .in("role", ["teacher", "office"]);
  if (profileErr) return { ok: false, error: profileErr.message };

  revalidateStaffPaths(data.id);
  return { ok: true, id: data.id };
}

export async function setStaffActive(id: string, active: boolean): Promise<ActionResult> {
  const { error, studioId } = await getAdminStudio();
  if (error || !studioId) return { ok: false, error: error ?? "No studio." };

  const admin = createAdminClient();
  const { error: memberErr } = await admin
    .from("staff_members")
    .update({ active, end_date: active ? null : new Date().toISOString().slice(0, 10) })
    .eq("profile_id", id)
    .eq("studio_id", studioId);
  if (memberErr) return { ok: false, error: memberErr.message };

  revalidateStaffPaths(id);
  return { ok: true, id };
}

export async function createStaffShift(
  input: z.infer<typeof ShiftSchema>,
): Promise<ActionResult> {
  const { error, studioId } = await getAdminStudio();
  if (error || !studioId) return { ok: false, error: error ?? "No studio." };

  const parsed = ShiftSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const data = parsed.data;

  const admin = createAdminClient();
  const { data: row, error: insertErr } = await admin
    .from("staff_shifts")
    .insert({
      studio_id: studioId,
      staff_id: data.staffId,
      shift_date: data.shiftDate,
      start_time: normalizeTime(data.startTime),
      end_time: normalizeTime(data.endTime),
      location_name: data.locationName || null,
      notes: data.notes || null,
    })
    .select("id")
    .single();
  if (insertErr) return { ok: false, error: insertErr.message };

  revalidateStaffPaths(data.staffId);
  return { ok: true, id: row.id };
}

export async function updateStaffShift(
  id: string,
  input: z.infer<typeof ShiftSchema>,
): Promise<ActionResult> {
  const { error, studioId } = await getAdminStudio();
  if (error || !studioId) return { ok: false, error: error ?? "No studio." };

  const parsed = ShiftSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const data = parsed.data;

  const admin = createAdminClient();
  const { error: updateErr } = await admin
    .from("staff_shifts")
    .update({
      staff_id: data.staffId,
      shift_date: data.shiftDate,
      start_time: normalizeTime(data.startTime),
      end_time: normalizeTime(data.endTime),
      location_name: data.locationName || null,
      notes: data.notes || null,
    })
    .eq("id", id)
    .eq("studio_id", studioId);
  if (updateErr) return { ok: false, error: updateErr.message };

  revalidateStaffPaths(data.staffId);
  return { ok: true, id };
}

export async function deleteStaffShift(id: string): Promise<ActionResult> {
  const { error, studioId } = await getAdminStudio();
  if (error || !studioId) return { ok: false, error: error ?? "No studio." };

  const admin = createAdminClient();
  const { error: deleteErr } = await admin
    .from("staff_shifts")
    .delete()
    .eq("id", id)
    .eq("studio_id", studioId);
  if (deleteErr) return { ok: false, error: deleteErr.message };

  revalidateStaffPaths();
  return { ok: true };
}
