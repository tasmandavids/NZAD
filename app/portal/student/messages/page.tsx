import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MessagesPanel } from "@/components/admin/messages/MessagesPanel";
import { loadStaffMessageContacts } from "@/lib/portal/staff-messages";
import { resolveEffectiveStudioId } from "@/lib/portal/access";

export default async function StudentMessagesPage({
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
    .select("studio_id, active_studio_id, role, self_managed")
    .eq("id", user.id)
    .single();

  const studioId = profile ? resolveEffectiveStudioId(profile) : null;
  if (profile?.role !== "student" || !profile.self_managed || !studioId) {
    redirect("/portal/student");
  }

  const { contacts, recentMessages } = await loadStaffMessageContacts(user.id, studioId);

  return (
    <MessagesPanel
      currentUserId={user.id}
      contacts={contacts}
      recentMessages={recentMessages}
      initialContactId={withParam ?? null}
    />
  );
}
