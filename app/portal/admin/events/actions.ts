"use server";

// ============================================================================
//  Events server actions
// ============================================================================

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

async function getAdminStudio() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in.", supabase, studioId: null, userId: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("studio_id, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return { error: "Admin only.", supabase, studioId: null, userId: null };
  if (!profile.studio_id)        return { error: "No studio.",  supabase, studioId: null, userId: null };

  return { error: null, supabase, studioId: profile.studio_id as string, userId: user.id };
}

const EventSchema = z.object({
  name:         z.string().min(1).max(200),
  description:  z.string().max(2000).optional().or(z.literal("")),
  eventDate:    z.string().min(1, "Event date required"),
  venueName:    z.string().max(200).optional().or(z.literal("")),
  venueAddress: z.string().max(500).optional().or(z.literal("")),
  ticketPrice:  z.coerce.number().int().min(0),      // in cents
  totalTickets: z.coerce.number().int().min(1).max(100_000),
  imageUrl:     z.string().url().optional().or(z.literal("")),
  status:       z.enum(["draft", "published"]).default("draft"),
});

export type EventFormData = z.infer<typeof EventSchema>;

export async function createEvent(input: unknown): Promise<ActionResult> {
  const parsed = EventSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { error, supabase, studioId, userId } = await getAdminStudio();
  if (error || !studioId) return { ok: false, error: error ?? "Unknown" };

  const d = parsed.data;
  const { error: dbErr } = await supabase.from("events").insert({
    studio_id:     studioId,
    name:          d.name,
    description:   d.description || null,
    event_date:    d.eventDate,
    venue_name:    d.venueName || null,
    venue_address: d.venueAddress || null,
    ticket_price:  d.ticketPrice,
    total_tickets: d.totalTickets,
    image_url:     d.imageUrl || null,
    status:        d.status,
    created_by:    userId,
  });

  if (dbErr) return { ok: false, error: dbErr.message };
  revalidatePath("/portal/admin/events");
  return { ok: true };
}

export async function updateEvent(eventId: string, input: unknown): Promise<ActionResult> {
  const parsed = EventSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { error, supabase, studioId } = await getAdminStudio();
  if (error || !studioId) return { ok: false, error: error ?? "Unknown" };

  const d = parsed.data;
  const { error: dbErr } = await supabase
    .from("events")
    .update({
      name:          d.name,
      description:   d.description || null,
      event_date:    d.eventDate,
      venue_name:    d.venueName || null,
      venue_address: d.venueAddress || null,
      ticket_price:  d.ticketPrice,
      total_tickets: d.totalTickets,
      image_url:     d.imageUrl || null,
      status:        d.status,
    })
    .eq("id", eventId)
    .eq("studio_id", studioId);

  if (dbErr) return { ok: false, error: dbErr.message };
  revalidatePath("/portal/admin/events");
  return { ok: true };
}

export async function publishEvent(eventId: string): Promise<ActionResult> {
  const { error, supabase, studioId } = await getAdminStudio();
  if (error || !studioId) return { ok: false, error: error ?? "Unknown" };

  const { error: dbErr } = await supabase
    .from("events")
    .update({ status: "published" })
    .eq("id", eventId)
    .eq("studio_id", studioId);

  if (dbErr) return { ok: false, error: dbErr.message };
  revalidatePath("/portal/admin/events");
  return { ok: true };
}

export async function cancelEvent(eventId: string): Promise<ActionResult> {
  const { error, supabase, studioId } = await getAdminStudio();
  if (error || !studioId) return { ok: false, error: error ?? "Unknown" };

  const { error: dbErr } = await supabase
    .from("events")
    .update({ status: "cancelled" })
    .eq("id", eventId)
    .eq("studio_id", studioId);

  if (dbErr) return { ok: false, error: dbErr.message };
  revalidatePath("/portal/admin/events");
  return { ok: true };
}

export async function deleteEvent(eventId: string): Promise<ActionResult> {
  const { error, supabase, studioId } = await getAdminStudio();
  if (error || !studioId) return { ok: false, error: error ?? "Unknown" };

  // Only allow deleting drafts
  const { error: dbErr } = await supabase
    .from("events")
    .delete()
    .eq("id", eventId)
    .eq("studio_id", studioId)
    .eq("status", "draft");

  if (dbErr) return { ok: false, error: dbErr.message };
  revalidatePath("/portal/admin/events");
  return { ok: true };
}
