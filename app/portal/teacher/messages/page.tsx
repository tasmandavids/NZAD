import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MessagesPanel } from "@/components/admin/messages/MessagesPanel";
import { loadTeacherMessageContacts } from "@/lib/portal/teacher-messages";

export default async function TeacherMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ with?: string }>;
}) {
  const { with: withParam } = await searchParams;
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

  if (profile?.role !== "teacher" || !profile.studio_id) redirect("/portal/teacher");

  const { contacts, recentMessages } = await loadTeacherMessageContacts(
    user.id,
    profile.studio_id,
  );

  return (
    <MessagesPanel
      currentUserId={user.id}
      contacts={contacts}
      recentMessages={recentMessages}
      initialContactId={withParam ?? null}
    />
  );
}
