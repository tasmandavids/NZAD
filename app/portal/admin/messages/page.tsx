// ============================================================================
//  /portal/admin/messages — Internal messaging hub (server component shell)
// ============================================================================

import { redirect } from "next/navigation";
import { MessagesPanel } from "@/components/admin/messages/MessagesPanel";
import { isStudioOpsRole } from "@/lib/portal/access";
import { isMessageTopic } from "@/lib/portal/message-topics";
import { normalizeMessageContact } from "@/lib/portal/staff-messages";
import { requirePortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ with?: string; topic?: string }>;
}) {
  const { with: withParam, topic: topicParam } = await searchParams;
  const { supabase, userId, studioId, role } = await requirePortalSession();

  if (!isStudioOpsRole(role)) {
    redirect(role === "office" ? "/portal/office" : "/portal/admin");
  }

  const [{ data: contacts }, { data: recentMessages }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("studio_id", studioId)
      .neq("id", userId)
      .order("full_name"),
    supabase
      .from("messages")
      .select("id, from_user_id, to_user_id, body, channel, topic, sent_at, read_at")
      .eq("studio_id", studioId)
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
      .order("sent_at", { ascending: false })
      .limit(100),
  ]);

  const normalizedContacts = (contacts ?? []).map((c) =>
    normalizeMessageContact({
      id: c.id as string,
      full_name: c.full_name as string | null,
      role: c.role as string,
    }),
  );

  const initialTopic =
    topicParam && isMessageTopic(topicParam) ? topicParam : null;

  return (
    <MessagesPanel
      currentUserId={userId}
      contacts={normalizedContacts}
      recentMessages={recentMessages ?? []}
      initialContactId={withParam ?? null}
      initialTopic={initialTopic}
    />
  );
}
