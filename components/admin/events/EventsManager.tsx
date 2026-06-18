"use client";

// ============================================================================
//  EventsManager — full CRUD for studio events with a 4-step creation wizard.
//  Steps: Basic Info → Venue → Tickets & Pricing → Review & Publish
// ============================================================================

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  createEvent,
  updateEvent,
  publishEvent,
  cancelEvent,
  deleteEvent,
  getEventTickets,
  type EventFormData,
  type TicketRow,
} from "@/app/portal/admin/events/actions";
import { refundSale } from "@/app/portal/admin/billing/refund-actions";

interface Event {
  id:             string;
  name:           string;
  description:    string | null;
  event_date:     string;
  venue_name:     string | null;
  venue_address:  string | null;
  ticket_price:   number;
  total_tickets:  number;
  sold_tickets:   number;
  status:         "draft" | "published" | "cancelled" | "completed";
  image_url:      string | null;
  created_at:     string;
}

const STATUS_BADGE: Record<Event["status"], string> = {
  draft:     "bg-yellow-500/10 text-yellow-600",
  published: "bg-green-500/10 text-green-600",
  cancelled: "bg-red-500/10 text-red-500",
  completed: "bg-blue-500/10 text-blue-500",
};

const BLANK_FORM: EventFormData = {
  name:         "",
  description:  "",
  eventDate:    "",
  venueName:    "",
  venueAddress: "",
  ticketPrice:  0,
  totalTickets: 100,
  imageUrl:     "",
  status:       "draft",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString([], {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatPrice(cents: number) {
  if (cents === 0) return "Free";
  return new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD" })
    .format(cents / 100);
}

// ── Wizard step component ────────────────────────────────────────────────────

type WizardStep = 0 | 1 | 2 | 3;

function WizardStepIndicator({ current }: { current: WizardStep }) {
  const steps = ["Basic Info", "Venue", "Tickets", "Review"];
  return (
    <div className="flex items-center gap-2 mb-6">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors ${
            i <= current ? "bg-brand text-white" : "bg-[--hair] text-muted"
          }`}>
            {i < current ? "✓" : i + 1}
          </div>
          <span className={`text-xs ${i === current ? "font-semibold text-ink" : "text-muted"}`}>
            {label}
          </span>
          {i < steps.length - 1 && (
            <div className={`h-px w-8 ${i < current ? "bg-brand" : "bg-[--hair]"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

const TICKET_STATUS_BADGE: Record<string, string> = {
  reserved:  "bg-yellow-500/10 text-yellow-600",
  paid:      "bg-green-500/10 text-green-600",
  cancelled: "bg-red-500/10 text-red-500",
  refunded:  "bg-gray-500/10 text-gray-500",
};

function TicketRefundButton({ ticket, onDone }: { ticket: TicketRow; onDone: (id: string) => void }) {
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  if (ticket.status !== "paid") return <span className="text-xs text-muted">—</span>;
  if (!ticket.stripe_payment_intent_id) {
    return <span className="text-[0.7rem] text-muted">No card payment</span>;
  }

  const onClick = () => {
    setErr(null);
    if (!confirm(`Refund ${formatPrice(ticket.total_cents)} for ${ticket.buyerName}? This frees the seat(s) and cannot be undone.`)) {
      return;
    }
    startTransition(async () => {
      const res = await refundSale("ticket", ticket.id);
      if (res.ok) onDone(ticket.id);
      else setErr(res.error);
    });
  };

  return (
    <div className="flex flex-col items-end gap-0.5">
      <button
        onClick={onClick}
        disabled={pending}
        className="rounded-lg border border-[--hair] px-2.5 py-1 text-[0.7rem] font-semibold text-red-500 hover:bg-red-500/10 disabled:opacity-50"
      >
        {pending ? "Refunding…" : "Refund"}
      </button>
      {err && <span className="max-w-[12rem] text-right text-[0.65rem] text-red-500">{err}</span>}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export function EventsManager({ events: initial }: { events: Event[] }) {
  const [events,      setEvents]      = useState(initial);
  const [wizardOpen,  setWizardOpen]  = useState(false);
  const [editTarget,  setEditTarget]  = useState<Event | null>(null);
  const [step,        setStep]        = useState<WizardStep>(0);
  const [form,        setForm]        = useState<EventFormData>(BLANK_FORM);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [viewTickets, setViewTickets] = useState<Event | null>(null);
  const [tickets,      setTickets]      = useState<TicketRow[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketsError, setTicketsError] = useState<string | null>(null);

  async function openTickets(ev: Event) {
    setViewTickets(ev);
    setTickets([]);
    setTicketsError(null);
    setTicketsLoading(true);
    const res = await getEventTickets(ev.id);
    setTicketsLoading(false);
    if (res.ok) setTickets(res.tickets);
    else setTicketsError(res.error);
  }

  function closeTickets() {
    setViewTickets(null);
    setTickets([]);
    setTicketsError(null);
  }

  const markTicketRefunded = (id: string) =>
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status: "refunded" } : t)));

  function openCreate() {
    setEditTarget(null);
    setForm(BLANK_FORM);
    setStep(0);
    setError(null);
    setWizardOpen(true);
  }

  function openEdit(e: Event) {
    setEditTarget(e);
    setForm({
      name:         e.name,
      description:  e.description ?? "",
      eventDate:    e.event_date.slice(0, 16),   // datetime-local format
      venueName:    e.venue_name ?? "",
      venueAddress: e.venue_address ?? "",
      ticketPrice:  e.ticket_price,
      totalTickets: e.total_tickets,
      imageUrl:     e.image_url ?? "",
      status:       e.status === "published" ? "published" : "draft",
    });
    setStep(0);
    setError(null);
    setWizardOpen(true);
  }

  function closeWizard() {
    setWizardOpen(false);
    setEditTarget(null);
    setError(null);
  }

  function field(k: keyof EventFormData, value: string | number) {
    setForm((f) => ({ ...f, [k]: value }));
  }

  async function save(publish = false) {
    setSaving(true);
    setError(null);
    const data: EventFormData = {
      ...form,
      // Convert datetime-local to ISO
      eventDate: form.eventDate ? new Date(form.eventDate).toISOString() : "",
      status: publish ? "published" : "draft",
    };

    const result = editTarget
      ? await updateEvent(editTarget.id, data)
      : await createEvent(data);

    setSaving(false);
    if (!result.ok) { setError(result.error); return; }

    // Reload via router would re-fetch; here we just close and rely on server revalidation
    closeWizard();
    window.location.reload();
  }

  async function handlePublish(id: string) {
    await publishEvent(id);
    window.location.reload();
  }

  async function handleCancel(id: string) {
    if (!confirm("Cancel this event? Ticket holders will need to be refunded manually.")) return;
    await cancelEvent(id);
    window.location.reload();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this draft event?")) return;
    await deleteEvent(id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }

  const upcoming = events.filter((e) => e.status !== "cancelled" && e.status !== "completed");
  const past     = events.filter((e) => e.status === "cancelled" || e.status === "completed");

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-5xl px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-ink">Events & Recitals</h1>
            <p className="text-sm text-muted">{upcoming.length} upcoming</p>
          </div>
          <button
            onClick={openCreate}
            className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          >
            + New Event
          </button>
        </div>

        {/* Upcoming events */}
        {upcoming.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[--hair] py-16 text-center">
            <p className="text-3xl mb-3">🎭</p>
            <p className="font-semibold text-ink">No upcoming events</p>
            <p className="text-sm text-muted mt-1">Create a recital, showcase, or workshop to get started.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {upcoming.map((ev) => {
              const available = ev.total_tickets - ev.sold_tickets;
              const pct       = Math.round((ev.sold_tickets / ev.total_tickets) * 100);

              return (
                <div
                  key={ev.id}
                  className="rounded-2xl border border-[--hair] bg-surface p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-ink truncate">{ev.name}</h3>
                        <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${STATUS_BADGE[ev.status]}`}>
                          {ev.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted">{formatDate(ev.event_date)}</p>
                      {ev.venue_name && (
                        <p className="text-xs text-muted mt-0.5">📍 {ev.venue_name}</p>
                      )}
                      {ev.description && (
                        <p className="text-xs text-muted mt-2 line-clamp-2">{ev.description}</p>
                      )}

                      {/* Ticket progress */}
                      <div className="mt-3 flex items-center gap-3">
                        <div className="flex-1 h-1.5 rounded-full bg-[--hair] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-brand transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted whitespace-nowrap">
                          {ev.sold_tickets}/{ev.total_tickets} tickets · {formatPrice(ev.ticket_price)}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 flex-col gap-1.5">
                      {ev.status === "draft" && (
                        <button
                          onClick={() => handlePublish(ev.id)}
                          className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                        >
                          Publish
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(ev)}
                        className="rounded-lg border border-[--hair] px-3 py-1.5 text-xs text-ink hover:bg-base"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => openTickets(ev)}
                        className="rounded-lg border border-[--hair] px-3 py-1.5 text-xs text-ink hover:bg-base"
                      >
                        Tickets
                      </button>
                      {ev.status === "published" && (
                        <button
                          onClick={() => handleCancel(ev.id)}
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50/10"
                        >
                          Cancel
                        </button>
                      )}
                      {ev.status === "draft" && (
                        <button
                          onClick={() => handleDelete(ev.id)}
                          className="rounded-lg border border-[--hair] px-3 py-1.5 text-xs text-muted hover:text-red-500"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Past events */}
        {past.length > 0 && (
          <div className="mt-10">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted">Past Events</h2>
            <div className="space-y-3">
              {past.map((ev) => (
                <div key={ev.id} className="flex items-center justify-between rounded-xl border border-[--hair] bg-surface/50 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-ink">{ev.name}</p>
                    <p className="text-xs text-muted">{formatDate(ev.event_date)} · {ev.sold_tickets} tickets sold</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => openTickets(ev)}
                      className="rounded-lg border border-[--hair] px-3 py-1 text-xs text-ink hover:bg-base"
                    >
                      Tickets
                    </button>
                    <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${STATUS_BADGE[ev.status]}`}>
                      {ev.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Creation Wizard / Edit slide-over ─────────────────────────────── */}
      <AnimatePresence>
        {wizardOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={closeWizard}
            />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.35 }}
              className="fixed right-0 top-0 z-50 flex h-full w-full max-w-lg flex-col bg-surface shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-[--hair] px-6 py-4">
                <h2 className="font-semibold text-ink">
                  {editTarget ? "Edit Event" : "New Event"}
                </h2>
                <button onClick={closeWizard} className="text-muted hover:text-ink text-lg">✕</button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5">
                <WizardStepIndicator current={step} />

                {/* Step 0: Basic Info */}
                {step === 0 && (
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-muted uppercase tracking-wider">Event Name *</label>
                      <input
                        type="text" value={form.name} onChange={(e) => field("name", e.target.value)}
                        placeholder="Spring Recital 2026"
                        className="w-full rounded-xl border border-[--hair] bg-base px-4 py-2.5 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-muted uppercase tracking-wider">Date & Time *</label>
                      <input
                        type="datetime-local" value={form.eventDate} onChange={(e) => field("eventDate", e.target.value)}
                        className="w-full rounded-xl border border-[--hair] bg-base px-4 py-2.5 text-sm text-ink focus:border-brand focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-muted uppercase tracking-wider">Description</label>
                      <textarea
                        rows={4} value={form.description} onChange={(e) => field("description", e.target.value)}
                        placeholder="Tell families what to expect…"
                        className="w-full resize-none rounded-xl border border-[--hair] bg-base px-4 py-2.5 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-muted uppercase tracking-wider">Banner Image URL</label>
                      <input
                        type="url" value={form.imageUrl} onChange={(e) => field("imageUrl", e.target.value)}
                        placeholder="https://…"
                        className="w-full rounded-xl border border-[--hair] bg-base px-4 py-2.5 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Step 1: Venue */}
                {step === 1 && (
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-muted uppercase tracking-wider">Venue Name</label>
                      <input
                        type="text" value={form.venueName} onChange={(e) => field("venueName", e.target.value)}
                        placeholder="City Concert Hall"
                        className="w-full rounded-xl border border-[--hair] bg-base px-4 py-2.5 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-muted uppercase tracking-wider">Address</label>
                      <textarea
                        rows={3} value={form.venueAddress} onChange={(e) => field("venueAddress", e.target.value)}
                        placeholder="123 Main St, Sydney NSW 2000"
                        className="w-full resize-none rounded-xl border border-[--hair] bg-base px-4 py-2.5 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none"
                      />
                    </div>
                    <div className="rounded-xl bg-brand/5 p-4 text-sm text-muted">
                      <p className="font-medium text-ink mb-1">💡 Tip</p>
                      <p>Leave venue empty for online-only events. The full address will be shown on tickets.</p>
                    </div>
                  </div>
                )}

                {/* Step 2: Tickets */}
                {step === 2 && (
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-muted uppercase tracking-wider">Ticket Price (cents — 0 for free)</label>
                      <input
                        type="number" min="0" step="100" value={form.ticketPrice}
                        onChange={(e) => field("ticketPrice", parseInt(e.target.value) || 0)}
                        className="w-full rounded-xl border border-[--hair] bg-base px-4 py-2.5 text-sm text-ink focus:border-brand focus:outline-none"
                      />
                      <p className="mt-1 text-xs text-muted">
                        {form.ticketPrice === 0 ? "Free event" : `$${(form.ticketPrice / 100).toFixed(2)} per ticket`}
                      </p>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-muted uppercase tracking-wider">Total Ticket Capacity</label>
                      <input
                        type="number" min="1" value={form.totalTickets}
                        onChange={(e) => field("totalTickets", parseInt(e.target.value) || 1)}
                        className="w-full rounded-xl border border-[--hair] bg-base px-4 py-2.5 text-sm text-ink focus:border-brand focus:outline-none"
                      />
                    </div>
                    <div className="rounded-xl border border-[--hair] bg-base p-4">
                      <p className="text-xs text-muted mb-1">Summary</p>
                      <p className="text-sm font-semibold text-ink">
                        {form.totalTickets} tickets × {form.ticketPrice === 0 ? "Free" : `$${(form.ticketPrice / 100).toFixed(2)}`}
                        {form.ticketPrice > 0 && (
                          <span className="text-muted"> = ${((form.totalTickets * form.ticketPrice) / 100).toFixed(2)} potential revenue</span>
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {/* Step 3: Review */}
                {step === 3 && (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-[--hair] bg-base p-5 space-y-3">
                      <div>
                        <p className="text-xs text-muted uppercase tracking-wider">Event</p>
                        <p className="font-semibold text-ink">{form.name || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted uppercase tracking-wider">Date</p>
                        <p className="text-sm text-ink">{form.eventDate ? formatDate(new Date(form.eventDate).toISOString()) : "—"}</p>
                      </div>
                      {form.venueName && (
                        <div>
                          <p className="text-xs text-muted uppercase tracking-wider">Venue</p>
                          <p className="text-sm text-ink">{form.venueName}</p>
                          {form.venueAddress && <p className="text-xs text-muted">{form.venueAddress}</p>}
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-muted uppercase tracking-wider">Tickets</p>
                        <p className="text-sm text-ink">
                          {form.totalTickets} × {formatPrice(form.ticketPrice)}
                        </p>
                      </div>
                    </div>
                    {error && (
                      <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-500">{error}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Footer nav */}
              <div className="flex items-center justify-between border-t border-[--hair] px-6 py-4 gap-3">
                <button
                  onClick={step === 0 ? closeWizard : () => setStep((s) => (s - 1) as WizardStep)}
                  className="rounded-xl border border-[--hair] px-4 py-2 text-sm text-muted hover:text-ink"
                >
                  {step === 0 ? "Cancel" : "← Back"}
                </button>

                <div className="flex gap-2">
                  {step < 3 ? (
                    <button
                      onClick={() => {
                        if (step === 0 && !form.name.trim()) { setError("Event name is required"); return; }
                        if (step === 0 && !form.eventDate)   { setError("Event date is required"); return; }
                        setError(null);
                        setStep((s) => (s + 1) as WizardStep);
                      }}
                      className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                    >
                      Next →
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => save(false)}
                        disabled={saving}
                        className="rounded-xl border border-[--hair] px-4 py-2 text-sm font-semibold text-ink hover:bg-base disabled:opacity-40"
                      >
                        {saving ? "Saving…" : "Save Draft"}
                      </button>
                      <button
                        onClick={() => save(true)}
                        disabled={saving}
                        className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
                      >
                        {saving ? "Publishing…" : "Publish Event"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Ticket viewer / refund panel ──────────────────────────────────── */}
      <AnimatePresence>
        {viewTickets && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={closeTickets}
            />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.35 }}
              className="fixed right-0 top-0 z-50 flex h-full w-full max-w-lg flex-col bg-surface shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-[--hair] px-6 py-4">
                <div className="min-w-0">
                  <h2 className="font-semibold text-ink truncate">{viewTickets.name}</h2>
                  <p className="text-xs text-muted">Tickets &amp; refunds</p>
                </div>
                <button onClick={closeTickets} className="text-muted hover:text-ink text-lg">✕</button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5">
                {ticketsLoading ? (
                  <p className="py-10 text-center text-sm text-muted">Loading tickets…</p>
                ) : ticketsError ? (
                  <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-500">{ticketsError}</p>
                ) : tickets.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted">No tickets purchased yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {tickets.map((t) => (
                      <li
                        key={t.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-[--hair] bg-base px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-ink truncate">{t.buyerName}</p>
                          <p className="text-xs text-muted">
                            {t.quantity} × · {formatPrice(t.total_cents)} ·{" "}
                            {new Date(t.purchased_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                          <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[0.6rem] font-semibold ${TICKET_STATUS_BADGE[t.status] ?? ""}`}>
                            {t.status}
                          </span>
                        </div>
                        <TicketRefundButton ticket={t} onDone={markTicketRefunded} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
