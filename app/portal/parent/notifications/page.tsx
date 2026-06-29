import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NotificationsTimeline } from "@/components/portal/parent/NotificationsTimeline";
import { markNotificationRead, markAllNotificationsRead } from "./actions";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("parent_notifications")
    .select("id, type, title, body, action_url, read_at, created_at")
    .eq("parent_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const notifications = (data ?? []).map((n: {
    id: string;
    type: string;
    title: string;
    body: string | null;
    action_url: string | null;
    read_at: string | null;
    created_at: string;
  }) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    actionUrl: n.action_url,
    readAt: n.read_at,
    createdAt: n.created_at,
  }));

  return (
    <NotificationsTimeline
      notifications={notifications}
      onMarkRead={markNotificationRead}
      onMarkAllRead={markAllNotificationsRead}
    />
  );
}
