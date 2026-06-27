import { createClient } from "@/lib/supabase/server";
import { loadStudioAdminContact } from "@/lib/portal/message-recipients";
import { normalizeMessageContact } from "@/lib/portal/staff-messages";

export type ParentChatTopic = "billing" | "absence" | "general";

export type ParentChatTeacher = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  classNames: string[];
};

export type ParentChatAdmin = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  role: string;
};

export type ParentChatMessage = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  body: string;
  channel: string;
  sent_at: string;
  read_at: string | null;
};

function displayName(row: { first_name: string | null; last_name: string | null }) {
  return [row.first_name, row.last_name].filter(Boolean).join(" ") || null;
}

export async function loadParentChatData(parentId: string, studioId: string) {
  const supabase = await createClient();

  const adminContact = await loadStudioAdminContact(supabase, studioId);

  let admin: ParentChatAdmin | null = null;
  if (adminContact) {
    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("id", adminContact.id)
      .single();

    if (adminProfile) {
      const normalized = normalizeMessageContact({
        id: adminProfile.id as string,
        full_name: adminProfile.full_name as string | null,
        role: adminProfile.role as string,
      });
      admin = {
        id: normalized.id,
        first_name: normalized.first_name,
        last_name: normalized.last_name,
        avatar_url: normalized.avatar_url,
        role: normalized.role,
      };
    }
  }

  const { data: guardianships } = await supabase
    .from("guardianships")
    .select("student_id")
    .eq("guardian_id", parentId);

  const studentIds = (guardianships ?? []).map((g) => g.student_id as string);

  const teachersById = new Map<string, ParentChatTeacher>();

  if (studentIds.length > 0) {
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select(
        "student_id, classes!inner(id, name, teacher_id, studio_id, teacher:profiles!classes_teacher_id_fkey(id, full_name))",
      )
      .eq("studio_id", studioId)
      .eq("status", "active")
      .in("student_id", studentIds);

    for (const row of enrollments ?? []) {
      const cls = row.classes as unknown as {
        name: string;
        teacher_id: string | null;
        studio_id: string;
        teacher: {
          id: string;
          full_name: string | null;
        } | null;
      } | null;

      if (!cls?.teacher_id || !cls.teacher || cls.studio_id !== studioId) continue;

      const existing = teachersById.get(cls.teacher_id);
      if (existing) {
        if (!existing.classNames.includes(cls.name)) {
          existing.classNames.push(cls.name);
        }
        continue;
      }

      const normalized = normalizeMessageContact({
        id: cls.teacher.id,
        full_name: cls.teacher.full_name,
        role: "teacher",
      });

      teachersById.set(cls.teacher_id, {
        id: normalized.id,
        first_name: normalized.first_name,
        last_name: normalized.last_name,
        avatar_url: normalized.avatar_url,
        classNames: [cls.name],
      });
    }
  }

  const teachers = [...teachersById.values()].sort((a, b) => {
    const nameA = displayName(a) ?? "";
    const nameB = displayName(b) ?? "";
    return nameA.localeCompare(nameB);
  });

  const { data: recentMessages } = await supabase
    .from("messages")
    .select("id, from_user_id, to_user_id, body, channel, sent_at, read_at")
    .eq("studio_id", studioId)
    .or(`from_user_id.eq.${parentId},to_user_id.eq.${parentId}`)
    .order("sent_at", { ascending: false })
    .limit(100);

  return {
    admin,
    teachers,
    recentMessages: (recentMessages ?? []) as ParentChatMessage[],
  };
}
