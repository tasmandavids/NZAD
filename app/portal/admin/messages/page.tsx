// ============================================================================
//  /portal/admin/messages — Internal messaging hub (server component shell)
// ============================================================================

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MessagesPanel } from "@/components/admin/messages/MessagesPanel";
import { isStudioOpsRole } from "@/lib/portal/access";
import type { Role } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MessagesPage({
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
    .select("id, studio_id, role, first_name, last_name")
    .eq("id", user.id)
    .single();

  if (!profile || !isStudioOpsRole(profile.role as Role)) {
    redirect(profile?.role === "office" ? "/portal/office" : "/portal/admin");
  }

  const { data: contacts } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, role, avatar_url, full_name")
    .eq("studio_id", profile.studio_id)
    .neq("id", user.id)
    .order("first_name");

  const { data: recentMessages } = await supabase
    .from("messages")
    .select("id, from_user_id, to_user_id, body, channel, sent_at, read_at")
    .eq("studio_id", profile.studio_id)
    .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
    .order("sent_at", { ascending: false })
    .limit(100);

  const normalizedContacts = (contacts ?? []).map((c) => ({
    id: c.id,
    first_name: c.first_name ?? (c.full_name?.split(" ")[0] ?? null),
    last_name:
      c.last_name ??
      (c.full_name?.split(" ").slice(1).join(" ") || null),
    role: c.role as string,
    avatar_url: c.avatar_url as string | null,
  }));

  return (
    <MessagesPanel
      currentUserId={user.id}
      contacts={normalizedContacts}
      recentMessages={recentMessages ?? []}
      initialContactId={withParam ?? null}
    />
  );
}
