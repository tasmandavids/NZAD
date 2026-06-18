// ============================================================================
//  /portal/admin/messages — Internal messaging hub (server component shell)
// ============================================================================

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MessagesPanel } from "@/components/admin/messages/MessagesPanel";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, studio_id, role, first_name, last_name")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") redirect("/portal/admin");

  // Fetch all studio members the admin can message
  const { data: contacts } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, role, avatar_url")
    .eq("studio_id", profile.studio_id)
    .neq("id", user.id)
    .order("first_name");

  // Fetch recent conversations (latest message per contact)
  const { data: recentMessages } = await supabase
    .from("messages")
    .select("id, from_user_id, to_user_id, body, channel, sent_at, read_at")
    .eq("studio_id", profile.studio_id)
    .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
    .order("sent_at", { ascending: false })
    .limit(100);

  return (
    <MessagesPanel
      currentUserId={user.id}
      contacts={contacts ?? []}
      recentMessages={recentMessages ?? []}
    />
  );
}
