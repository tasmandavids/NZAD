import { createClient } from "@/lib/supabase/server";

export async function loadStaffMessageContacts(userId: string, studioId: string) {
  const supabase = await createClient();

  const { data: contacts } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, role, avatar_url, full_name")
    .eq("studio_id", studioId)
    .in("role", ["admin", "office"])
    .neq("id", userId)
    .order("first_name");

  const { data: recentMessages } = await supabase
    .from("messages")
    .select("id, from_user_id, to_user_id, body, channel, sent_at, read_at")
    .eq("studio_id", studioId)
    .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
    .order("sent_at", { ascending: false })
    .limit(100);

  const normalizedContacts = (contacts ?? []).map((c) => ({
    id: c.id as string,
    first_name: (c.first_name ?? c.full_name?.split(" ")[0] ?? null) as string | null,
    last_name: (c.last_name ?? (c.full_name?.split(" ").slice(1).join(" ") || null)) as string | null,
    role: c.role as string,
    avatar_url: c.avatar_url as string | null,
  }));

  return { contacts: normalizedContacts, recentMessages: recentMessages ?? [] };
}
