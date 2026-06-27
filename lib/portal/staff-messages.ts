import { createClient } from "@/lib/supabase/server";

export type MessageContact = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  avatar_url: string | null;
};

export function normalizeMessageContact(row: {
  id: string;
  full_name: string | null;
  role: string;
}): MessageContact {
  const parts = row.full_name?.trim().split(/\s+/).filter(Boolean) ?? [];
  return {
    id: row.id,
    first_name: parts[0] ?? null,
    last_name: parts.length > 1 ? parts.slice(1).join(" ") : null,
    role: row.role,
    avatar_url: null,
  };
}

export async function loadStaffMessageContacts(userId: string, studioId: string) {
  const supabase = await createClient();

  const { data: contacts } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("studio_id", studioId)
    .in("role", ["admin", "office"])
    .neq("id", userId)
    .order("full_name");

  const { data: recentMessages } = await supabase
    .from("messages")
    .select("id, from_user_id, to_user_id, body, channel, sent_at, read_at")
    .eq("studio_id", studioId)
    .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
    .order("sent_at", { ascending: false })
    .limit(100);

  const normalizedContacts = (contacts ?? []).map((c) =>
    normalizeMessageContact({
      id: c.id as string,
      full_name: c.full_name as string | null,
      role: c.role as string,
    }),
  );

  return { contacts: normalizedContacts, recentMessages: recentMessages ?? [] };
}
