import { createClient } from "@/lib/supabase/server";
import { normalizeMessageContact } from "@/lib/portal/staff-messages";

export async function loadTeacherMessageContacts(teacherId: string, studioId: string) {
  const supabase = await createClient();

  const { data: classes } = await supabase
    .from("classes")
    .select("id")
    .eq("studio_id", studioId)
    .eq("teacher_id", teacherId);

  const classIds = (classes ?? []).map((c) => c.id as string);

  const contactIds = new Set<string>();

  if (classIds.length > 0) {
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("student_id")
      .eq("studio_id", studioId)
      .eq("status", "active")
      .in("class_id", classIds);

    const studentIds = [...new Set((enrollments ?? []).map((e) => e.student_id as string))];

    if (studentIds.length > 0) {
      const { data: guardianships } = await supabase
        .from("guardianships")
        .select("guardian_id")
        .eq("studio_id", studioId)
        .in("student_id", studentIds);

      for (const row of guardianships ?? []) {
        contactIds.add(row.guardian_id as string);
      }

      for (const studentId of studentIds) {
        contactIds.add(studentId);
      }
    }
  }

  const { data: recentMessages } = await supabase
    .from("messages")
    .select("id, from_user_id, to_user_id, body, channel, sent_at, read_at")
    .eq("studio_id", studioId)
    .or(`from_user_id.eq.${teacherId},to_user_id.eq.${teacherId}`)
    .order("sent_at", { ascending: false })
    .limit(100);

  for (const msg of recentMessages ?? []) {
    contactIds.add(
      msg.from_user_id === teacherId ? (msg.to_user_id as string) : (msg.from_user_id as string),
    );
  }

  contactIds.delete(teacherId);

  if (contactIds.size === 0) {
    return { contacts: [], recentMessages: recentMessages ?? [] };
  }

  const { data: contacts } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("studio_id", studioId)
    .in("id", [...contactIds])
    .in("role", ["parent", "student", "admin", "office"])
    .order("full_name");

  const normalizedContacts = (contacts ?? []).map((c) =>
    normalizeMessageContact({
      id: c.id as string,
      full_name: c.full_name as string | null,
      role: c.role as string,
    }),
  );

  return { contacts: normalizedContacts, recentMessages: recentMessages ?? [] };
}
