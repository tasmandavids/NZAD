// ============================================================================
//  /portal/admin/events — Events management hub (server component shell)
// ============================================================================

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { EventsManager } from "@/components/admin/events/EventsManager";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("studio_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") redirect("/portal/admin");

  const { data: events } = await supabase
    .from("events")
    .select("id, name, description, event_date, venue_name, venue_address, ticket_price, total_tickets, sold_tickets, status, image_url, created_at")
    .eq("studio_id", profile.studio_id)
    .order("event_date", { ascending: true });

  return <EventsManager events={events ?? []} />;
}
