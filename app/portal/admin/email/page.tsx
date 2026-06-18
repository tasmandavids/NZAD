import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmailInbox } from "@/components/admin/email/EmailInbox";
import { syncEmailAccount } from "@/lib/email/sync";
import type { EmailAccountRow } from "@/lib/email/types";

export const dynamic = "force-dynamic";

export default async function EmailPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; connected?: string }>;
}) {
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

  if (!profile || profile.role !== "admin") redirect("/portal/admin");
  if (!profile.studio_id) redirect("/portal/admin");

  const params = await searchParams;

  const [{ data: accounts }, { data: threads }] = await Promise.all([
    supabase
      .from("email_accounts")
      .select("id, provider, email_address, display_name, last_sync_at, sync_error")
      .eq("studio_id", profile.studio_id)
      .order("created_at"),
    supabase
      .from("email_threads")
      .select("*")
      .eq("studio_id", profile.studio_id)
      .order("last_message_at", { ascending: false })
      .limit(200),
  ]);

  if (params.connected && accounts?.length) {
    const latest = accounts.find((a) => a.provider === params.connected);
    if (latest) {
      await syncEmailAccount(supabase, latest as EmailAccountRow);
    }
  }

  let refreshedThreads = threads ?? [];
  if (params.connected) {
    const { data } = await supabase
      .from("email_threads")
      .select("*")
      .eq("studio_id", profile.studio_id)
      .order("last_message_at", { ascending: false })
      .limit(200);
    refreshedThreads = data ?? [];
  }

  return (
    <div className="h-full min-h-[calc(100vh-3rem)]">
      <EmailInbox
        accounts={accounts ?? []}
        threads={refreshedThreads}
        bannerError={params.error ? decodeURIComponent(params.error) : null}
        bannerConnected={params.connected ?? null}
      />
    </div>
  );
}
