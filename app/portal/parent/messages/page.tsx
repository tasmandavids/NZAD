import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "@/lib/i18n/server";
import { ParentEmailInbox } from "@/components/portal/parent/ParentEmailInbox";

export const dynamic = "force-dynamic";

export default async function ParentMessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, studio_id, studios!profiles_studio_id_fkey(name)")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "parent") redirect("/portal/parent");

  const { data: threads } = await supabase
    .from("parent_email_threads")
    .select("id, subject, snippet, participant_addresses, last_message_at, is_read")
    .eq("parent_id", user.id)
    .order("last_message_at", { ascending: false })
    .limit(200);

  const t = await getTranslations("parent.email");
  const studioName =
    (profile.studios as { name?: string } | null)?.name ?? t("yourStudio");

  return (
    <ParentEmailInbox
      threads={threads ?? []}
      studioName={studioName}
    />
  );
}
