"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  SCHEDULE_ENTRY_TYPES,
  type ScheduleEntry,
} from "@/lib/students/schedule-types";

export type ScheduleActionResult = { ok: true; id?: string } | { ok: false; error: string };

const EntryTypeSchema = z.enum(SCHEDULE_ENTRY_TYPES);

const EntrySchema = z.object({
  studentId: z.string().uuid(),
  title: z.string().trim().min(1, "Title is required").max(120),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")),
  entryType: EntryTypeSchema.default("other"),
  locationName: z.string().trim().max(120).optional().or(z.literal("")),
});

function revalidateSchedulePaths(studentId: string) {
  revalidatePath(`/portal/admin/students/${studentId}`);
  revalidatePath(`/portal/teacher/students/${studentId}`);
  revalidatePath("/portal/parent/schedule");
  revalidatePath("/portal/parent");
}

async function getScheduleActor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in.", supabase, user: null, studioId: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("studio_id, role")
    .eq("id", user.id)
    .single();

  const role = profile?.role;
  if (role !== "admin" && role !== "office" && role !== "teacher") {
    return { error: "Not permitted.", supabase, user, studioId: null };
  }
  if (!profile?.studio_id) {
    return { error: "No studio found.", supabase, user, studioId: null };
  }

  return {
    error: null,
    supabase,
    user,
    studioId: profile.studio_id as string,
  };
}

export async function createScheduleEntry(input: unknown): Promise<ScheduleActionResult> {
  const parsed = EntrySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { error, supabase, user, studioId } = await getScheduleActor();
  if (error || !user || !studioId) return { ok: false, error: error ?? "Unknown error." };

  const d = parsed.data;
  const { data, error: insErr } = await supabase
    .from("student_schedule_entries")
    .insert({
      studio_id: studioId,
      student_id: d.studentId,
      title: d.title,
      description: d.description || null,
      entry_date: d.entryDate,
      start_time: d.startTime || null,
      end_time: d.endTime || null,
      entry_type: d.entryType,
      location_name: d.locationName || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (insErr) return { ok: false, error: insErr.message };

  revalidateSchedulePaths(d.studentId);
  return { ok: true, id: data.id as string };
}

export async function updateScheduleEntry(
  entryId: string,
  input: unknown,
): Promise<ScheduleActionResult> {
  if (!z.string().uuid().safeParse(entryId).success) {
    return { ok: false, error: "Invalid entry." };
  }

  const parsed = EntrySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { error, supabase } = await getScheduleActor();
  if (error || !supabase) return { ok: false, error: error ?? "Unknown error." };

  const d = parsed.data;
  const { error: updErr } = await supabase
    .from("student_schedule_entries")
    .update({
      title: d.title,
      description: d.description || null,
      entry_date: d.entryDate,
      start_time: d.startTime || null,
      end_time: d.endTime || null,
      entry_type: d.entryType,
      location_name: d.locationName || null,
    })
    .eq("id", entryId)
    .eq("student_id", d.studentId);

  if (updErr) return { ok: false, error: updErr.message };

  revalidateSchedulePaths(d.studentId);
  return { ok: true, id: entryId };
}

export async function cancelScheduleEntry(
  entryId: string,
  studentId: string,
): Promise<ScheduleActionResult> {
  if (!z.string().uuid().safeParse(entryId).success) {
    return { ok: false, error: "Invalid entry." };
  }

  const { error, supabase } = await getScheduleActor();
  if (error || !supabase) return { ok: false, error: error ?? "Unknown error." };

  const { error: updErr } = await supabase
    .from("student_schedule_entries")
    .update({ cancelled_at: new Date().toISOString() })
    .eq("id", entryId)
    .eq("student_id", studentId)
    .is("cancelled_at", null);

  if (updErr) return { ok: false, error: updErr.message };

  revalidateSchedulePaths(studentId);
  return { ok: true, id: entryId };
}

export async function deleteScheduleEntry(
  entryId: string,
  studentId: string,
): Promise<ScheduleActionResult> {
  if (!z.string().uuid().safeParse(entryId).success) {
    return { ok: false, error: "Invalid entry." };
  }

  const { error, supabase, user } = await getScheduleActor();
  if (error || !supabase || !user) return { ok: false, error: error ?? "Unknown error." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "teacher") {
    return cancelScheduleEntry(entryId, studentId);
  }

  const { error: delErr } = await supabase
    .from("student_schedule_entries")
    .delete()
    .eq("id", entryId)
    .eq("student_id", studentId);

  if (delErr) return { ok: false, error: delErr.message };

  revalidateSchedulePaths(studentId);
  return { ok: true };
}
