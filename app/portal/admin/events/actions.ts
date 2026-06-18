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

export type TicketRow = {
  id:                       string;
  quantity:                 number;
  total_cents:              number;
  status:                   string;
  purchased_at:             string;
  stripe_payment_intent_id: string | null;
  buyerName:                string;
};

/**
 * List the tickets for one event (admin-only, studio-scoped via the parent
 * event). Used by the per-event ticket viewer + refund panel.
 */
export async function getEventTickets(
  eventId: string,
): Promise<{ ok: true; tickets: TicketRow[] } | { ok: false; error: string }> {
  const { error, supabase, studioId } = await getAdminStudio();
  if (error || !studioId) return { ok: false, error: error ?? "Unknown" };

  const { data, error: dbErr } = await supabase
    .from("event_tickets")
    .select(
      "id, quantity, total_cents, status, purchased_at, stripe_payment_intent_id, events!inner(studio_id), profiles!event_tickets_user_id_fkey(first_name, last_name)",
    )
    .eq("event_id", eventId)
    .eq("events.studio_id", studioId)
    .order("purchased_at", { ascending: false });

  if (dbErr) return { ok: false, error: dbErr.message };

  const tickets: TicketRow[] = (data ?? []).map((t) => {
    const prof = (Array.isArray(t.profiles) ? t.profiles[0] : t.profiles) as
      | { first_name: string | null; last_name: string | null }
      | null;
    const buyerName =
      prof ? [prof.first_name, prof.last_name].filter(Boolean).join(" ") || "Unknown" : "Unknown";
    return {
      id:                       t.id,
      quantity:                 t.quantity,
      total_cents:              t.total_cents,
      status:                   t.status,
      purchased_at:             t.purchased_at,
      stripe_payment_intent_id: t.stripe_payment_intent_id,
      buyerName,
    };
  });

  return { ok: true, tickets };
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
