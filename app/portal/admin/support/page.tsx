import { createClient } from "@/lib/supabase/server";
import { OwnerSupportPanel } from "@/components/admin/support/OwnerSupportPanel";

export default async function OwnerSupportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("studio_id")
    .eq("id", user!.id)
    .single();

  const { data: threads } = profile?.studio_id
    ? await supabase
        .from("platform_support_threads")
        .select("id, subject, status, updated_at")
        .eq("studio_id", profile.studio_id)
        .order("updated_at", { ascending: false })
    : { data: [] };

  const firstId = threads?.[0]?.id ?? null;

  const { data: msgRows } = firstId
    ? await supabase
        .from("platform_support_messages")
        .select("id, body, sender_operator_id, created_at")
        .eq("thread_id", firstId)
        .order("created_at")
    : { data: [] };

  return (
    <OwnerSupportPanel
      threads={(threads ?? []).map((t) => ({
        id: t.id,
        subject: t.subject,
        status: t.status,
        updatedAt: t.updated_at,
      }))}
      selectedThreadId={firstId}
      initialMessages={(msgRows ?? []).map((m) => ({
        id: m.id,
        body: m.body,
        isFromOlune: !!m.sender_operator_id,
        createdAt: m.created_at,
      }))}
    />
  );
}
