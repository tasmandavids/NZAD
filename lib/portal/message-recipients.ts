import type { SupabaseClient } from "@supabase/supabase-js";
import type { Role } from "@/lib/types";

export type MessageRecipientProfile = {
  id: string;
  role: Role;
};

/** Studio admin contact for parent/student studio messages (admin preferred, office fallback). */
export async function loadStudioAdminContact(
  supabase: SupabaseClient,
  studioId: string,
): Promise<MessageRecipientProfile | null> {
  const { data: admin } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("studio_id", studioId)
    .eq("role", "admin")
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (admin) {
    return { id: admin.id as string, role: "admin" };
  }

  const { data: office } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("studio_id", studioId)
    .eq("role", "office")
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (office) {
    return { id: office.id as string, role: "office" };
  }

  return null;
}

async function loadParentTeacherIds(
  supabase: SupabaseClient,
  parentId: string,
  studioId: string,
): Promise<Set<string>> {
  const { data: guardianships } = await supabase
    .from("guardianships")
    .select("student_id")
    .eq("guardian_id", parentId);

  const studentIds = (guardianships ?? []).map((g) => g.student_id as string);
  if (studentIds.length === 0) return new Set();

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("class_id, classes!inner(teacher_id, studio_id)")
    .eq("studio_id", studioId)
    .eq("status", "active")
    .in("student_id", studentIds);

  const teacherIds = new Set<string>();
  for (const row of enrollments ?? []) {
    const cls = row.classes as unknown as { teacher_id: string | null; studio_id: string } | null;
    if (cls?.studio_id === studioId && cls.teacher_id) {
      teacherIds.add(cls.teacher_id);
    }
  }
  return teacherIds;
}

async function loadStudentTeacherIds(
  supabase: SupabaseClient,
  studentId: string,
  studioId: string,
): Promise<Set<string>> {
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("class_id, classes!inner(teacher_id, studio_id)")
    .eq("studio_id", studioId)
    .eq("student_id", studentId)
    .eq("status", "active");

  const teacherIds = new Set<string>();
  for (const row of enrollments ?? []) {
    const cls = row.classes as unknown as { teacher_id: string | null; studio_id: string } | null;
    if (cls?.studio_id === studioId && cls.teacher_id) {
      teacherIds.add(cls.teacher_id);
    }
  }
  return teacherIds;
}

/** Whether the sender may open a thread with this peer. */
export async function canMessagePeer(
  supabase: SupabaseClient,
  sender: { id: string; role: Role; studioId: string },
  peer: MessageRecipientProfile,
): Promise<boolean> {
  if (peer.id === sender.id) return false;

  if (sender.role === "admin" || sender.role === "office") {
    return true;
  }

  if (sender.role === "teacher") {
    if (peer.role === "admin" || peer.role === "office") return true;
    if (peer.role === "parent") {
      const { data: guardianships } = await supabase
        .from("guardianships")
        .select("student_id")
        .eq("guardian_id", peer.id)
        .eq("studio_id", sender.studioId);

      const studentIds = (guardianships ?? []).map((g) => g.student_id as string);
      if (studentIds.length === 0) return false;

      const { count } = await supabase
        .from("enrollments")
        .select("id, classes!inner(teacher_id)", { count: "exact", head: true })
        .eq("studio_id", sender.studioId)
        .eq("status", "active")
        .in("student_id", studentIds)
        .eq("classes.teacher_id", sender.id);

      return (count ?? 0) > 0;
    }
    if (peer.role === "student") {
      const teacherIds = await loadStudentTeacherIds(supabase, peer.id, sender.studioId);
      return teacherIds.has(sender.id);
    }
    return peer.role === "teacher";
  }

  if (sender.role === "parent") {
    if (peer.role === "admin" || peer.role === "office") return true;
    if (peer.role === "teacher") {
      const teacherIds = await loadParentTeacherIds(supabase, sender.id, sender.studioId);
      return teacherIds.has(peer.id);
    }
    return false;
  }

  if (sender.role === "student") {
    if (peer.role === "admin" || peer.role === "office") return true;
    if (peer.role === "teacher") {
      const teacherIds = await loadStudentTeacherIds(supabase, sender.id, sender.studioId);
      return teacherIds.has(peer.id);
    }
    return false;
  }

  return false;
}

export async function loadPeerProfile(
  supabase: SupabaseClient,
  peerId: string,
  studioId: string,
): Promise<MessageRecipientProfile | null> {
  const { data } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", peerId)
    .eq("studio_id", studioId)
    .maybeSingle();

  if (!data) return null;
  return { id: data.id as string, role: data.role as Role };
}
