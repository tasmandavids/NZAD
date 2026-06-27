import { redirect } from "next/navigation";
import { MessagesPanel } from "@/components/admin/messages/MessagesPanel";
import { loadTeacherMessageContacts } from "@/lib/portal/teacher-messages";
import { requirePortalSession } from "@/lib/portal/session";

export default async function TeacherMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ with?: string }>;
}) {
  const { with: withParam } = await searchParams;
  const { userId, studioId, role } = await requirePortalSession();

  if (role !== "teacher") redirect("/portal/teacher");

  const { contacts, recentMessages } = await loadTeacherMessageContacts(userId, studioId);

  return (
    <MessagesPanel
      currentUserId={userId}
      contacts={contacts}
      recentMessages={recentMessages}
      initialContactId={withParam ?? null}
    />
  );
}
