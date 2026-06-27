import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ParentChatPanel } from "@/components/portal/parent/ParentChatPanel";
import { loadParentChatData } from "@/lib/portal/parent-chat";
import { isMessageTopic } from "@/lib/portal/message-topics";

export default async function ParentChatPage({
  searchParams,
}: {
  searchParams: Promise<{ with?: string; topic?: string }>;
}) {
  const { with: withParam, topic: topicParam } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("studio_id, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "parent" || !profile.studio_id) redirect("/portal/parent");

  const { admin, teachers, recentMessages } = await loadParentChatData(
    user.id,
    profile.studio_id,
  );

  const initialTopic =
    topicParam && isMessageTopic(topicParam) ? topicParam : null;

  return (
    <ParentChatPanel
      currentUserId={user.id}
      admin={admin}
      teachers={teachers}
      recentMessages={recentMessages}
      initialTopic={initialTopic}
      initialPeerId={withParam ?? null}
    />
  );
}
