// ============================================================================
//  /portal/parent — Family hub: children overview + invoice list.
//  Server component: fetches guardianships (children + their classes)
//  and invoices billed to this parent. Renders as a client component for
//  animated entrance.
// ============================================================================

import { createClient } from "@/lib/supabase/server";
import ParentHub from "@/components/portal/parent/ParentHub";
import { ParentShop } from "@/components/portal/parent/ParentShop";
import EventsTickets, {
  type ParentEvent,
} from "@/components/portal/parent/EventsTickets";
import AutoPaySetup, {
  type AutoPayItem,
} from "@/components/portal/parent/AutoPaySetup";

export type ShopProduct = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  stock_qty: number;
  category: string | null;
  image_url: string | null;
};

export type Child = {
  studentId: string;
  name: string | null;
  classes: {
    id: string;
    name: string;
    discipline: string | null;
    level: string | null;
    dayOfWeek: number;
    startTime: string | null;
    priceCents: number;
  }[];
};

export type Invoice = {
  id: string;
  amountCents: number;
  gstCents: number;
  status: string;
  dueDate: string | null;
  issuedAt: string | null;
  studentName: string | null;
};

export default async function ParentPortal() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Resolve the parent's studio so shop + events are scoped correctly.
  const { data: parentProfile } = await supabase
    .from("profiles")
    .select("studio_id")
    .eq("id", user!.id)
    .single();
  const studioId = (parentProfile?.studio_id as string | null) ?? null;

  const [
    guardianshipsRes,
    invoicesRes,
    profileRes,
    productsRes,
    eventsRes,
    ticketsRes,
    subscriptionsRes,
  ] = await Promise.all([
    supabase
      .from("guardianships")
      .select(`
        student_id,
        profiles!student_id (
          full_name,
          enrollments (
            id,
            status,
            classes (
              id, name, discipline, level, day_of_week, start_time, price_cents
            )
          )
        )
      `)
      .eq("guardian_id", user!.id),

    supabase
      .from("invoices")
      .select(`
        id, amount_cents, gst_cents, status, due_date, issued_at,
        profiles!student_id ( full_name )
      `)
      .eq("payer_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(20),

    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user!.id)
      .single(),

    // Active products for the studio shop (RLS allows studio members to browse).
    supabase
      .from("products")
      .select("id, name, description, price_cents, stock_qty, category, image_url")
      .eq("studio_id", studioId ?? "")
      .eq("active", true)
      .order("name"),

    // Published, upcoming events (RLS exposes only published rows to members).
    supabase
      .from("events")
      .select(
        "id, name, description, event_date, venue_name, venue_address, ticket_price, total_tickets, sold_tickets, image_url",
      )
      .eq("studio_id", studioId ?? "")
      .eq("status", "published")
      .order("event_date", { ascending: true }),

    // This parent's existing tickets, to mark events they already hold.
    supabase
      .from("event_tickets")
      .select("event_id, quantity, status, qr_code")
      .eq("user_id", user!.id),

    // Active auto-pay subscriptions, to mark classes already on auto-pay.
    supabase
      .from("subscriptions")
      .select("class_id, student_id, status, stripe_subscription_id, current_period_end, cancel_at_period_end")
      .eq("payer_id", user!.id),
  ]);

  const children: Child[] = (guardianshipsRes.data ?? []).map((g) => {
    const profile = g.profiles as unknown as {
      full_name: string | null;
      enrollments: {
        id: string;
        status: string;
        classes: {
          id: string; name: string; discipline: string | null;
          level: string | null; day_of_week: number; start_time: string | null;
          price_cents: number;
        } | null;
      }[];
    } | null;

    const activeEnrollments = (profile?.enrollments ?? [])
      .filter((e) => e.status === "active" && e.classes)
      .map((e) => ({
        id: e.classes!.id,
        name: e.classes!.name,
        discipline: e.classes!.discipline,
        level: e.classes!.level,
        dayOfWeek: e.classes!.day_of_week,
        startTime: e.classes!.start_time,
        priceCents: e.classes!.price_cents ?? 0,
      }));

    return {
      studentId: g.student_id,
      name: profile?.full_name ?? null,
      classes: activeEnrollments,
    };
  });

  const invoices: Invoice[] = (invoicesRes.data ?? []).map((inv) => {
    const student = inv.profiles as unknown as { full_name: string | null } | null;
    return {
      id: inv.id,
      amountCents: inv.amount_cents,
      gstCents: inv.gst_cents,
      status: inv.status,
      dueDate: inv.due_date,
      issuedAt: inv.issued_at,
      studentName: student?.full_name ?? null,
    };
  });

  const products: ShopProduct[] = (productsRes.data ?? []) as ShopProduct[];

  const ticketsByEvent = new Map<
    string,
    { quantity: number; status: string; qrCode: string | null }
  >(
    (ticketsRes.data ?? []).map((t) => [
      t.event_id as string,
      {
        quantity: t.quantity as number,
        status: t.status as string,
        qrCode: (t.qr_code as string | null) ?? null,
      },
    ]),
  );

  const events: ParentEvent[] = (eventsRes.data ?? []).map((e) => {
    const held = ticketsByEvent.get(e.id as string) ?? null;
    return {
      id: e.id as string,
      name: e.name as string,
      description: (e.description as string | null) ?? null,
      eventDate: e.event_date as string,
      venueName: (e.venue_name as string | null) ?? null,
      venueAddress: (e.venue_address as string | null) ?? null,
      ticketPrice: e.ticket_price as number,
      ticketsRemaining:
        (e.total_tickets as number) - (e.sold_tickets as number),
      imageUrl: (e.image_url as string | null) ?? null,
      myTicket: held,
    };
  });

  // ── Auto-pay (Phase 3.2) ──────────────────────────────────────────────────
  // Map existing subscriptions keyed by student+class, then build a flat list
  // of paid enrolled classes the parent can put on (or already has on) auto-pay.
  type SubRow = {
    class_id: string | null;
    student_id: string | null;
    status: string;
    stripe_subscription_id: string | null;
    cancel_at_period_end: boolean | null;
  };
  const subByKey = new Map<string, SubRow>(
    ((subscriptionsRes.data ?? []) as SubRow[]).map((s) => [
      `${s.student_id}:${s.class_id}`,
      s,
    ]),
  );

  const autoPayItems: AutoPayItem[] = [];
  for (const child of children) {
    for (const cls of child.classes) {
      if (cls.priceCents <= 0) continue; // free classes need no auto-pay
      const sub = subByKey.get(`${child.studentId}:${cls.id}`);
      const active = sub && ["active", "trialing", "past_due", "incomplete"].includes(sub.status);
      autoPayItems.push({
        studentId: child.studentId,
        studentName: child.name,
        classId: cls.id,
        className: cls.name,
        priceCents: cls.priceCents,
        subscriptionId: active ? (sub!.stripe_subscription_id ?? null) : null,
        status: active ? sub!.status : null,
        cancelAtPeriodEnd: active ? (sub!.cancel_at_period_end ?? false) : false,
      });
    }
  }

  return (
    <>
      <ParentHub
        parentName={profileRes.data?.full_name ?? null}
        familyChildren={children}
        invoices={invoices}
      />

      {(events.length > 0 || products.length > 0 || autoPayItems.length > 0) && (
        <div className="mx-auto max-w-5xl space-y-12 px-6 pb-16">
          {autoPayItems.length > 0 && <AutoPaySetup items={autoPayItems} />}
          {events.length > 0 && <EventsTickets events={events} />}
          {products.length > 0 && <ParentShop products={products} />}
        </div>
      )}
    </>
  );
}
