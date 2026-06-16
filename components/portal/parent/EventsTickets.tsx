"use client";

// ============================================================================
//  EventsTickets — parent-facing event browse + ticket purchase.
//  Lists published events. "Buy Ticket" calls /api/events/purchase and shows
//  the returned QR-code PNG on confirmation. Free events reserve immediately;
//  paid events return a Stripe clientSecret (card capture is wired in a later
//  pass — see OLUNE_PROGRESS.md notes).
// ============================================================================

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import CheckoutForm from "@/components/payments/CheckoutForm";

export type ParentEvent = {
  id: string;
  name: string;
  description: string | null;
  eventDate: string;
  venueName: string | null;
  venueAddress: string | null;
  ticketPrice: number; // cents (0 = free)
  ticketsRemaining: number;
  imageUrl: string | null;
  myTicket: { quantity: number; status: string; qrCode: string | null } | null;
};

interface Props {
  events: ParentEvent[];
}

const NZD = new Intl.NumberFormat("en-NZ", {
  style: "currency",
  currency: "NZD",
});

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NZ", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function EventsTickets({ events }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  // Paid flow: clientSecret drives the card form; pendingQr is shown once paid.
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [pendingQr, setPendingQr] = useState<string | null>(null);

  const active = events.find((e) => e.id === activeId) ?? null;

  function openEvent(ev: ParentEvent) {
    setActiveId(ev.id);
    setQty(1);
    setError(null);
    setClientSecret(null);
    setPendingQr(null);
    // Show an existing ticket's QR straight away if the parent already holds one.
    setQrCode(ev.myTicket?.qrCode ?? null);
  }

  function close() {
    setActiveId(null);
    setQrCode(null);
    setClientSecret(null);
    setPendingQr(null);
    setError(null);
    setBusy(false);
  }

  async function buy() {
    if (!active) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/events/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: active.id, quantity: qty }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Purchase failed");
        return;
      }
      if (data.free) {
        // Free event — ticket already confirmed; show the QR immediately.
        setQrCode(data.qrCode ?? null);
      } else if (data.clientSecret) {
        // Paid event — collect card first; reveal QR after payment succeeds.
        setPendingQr(data.qrCode ?? null);
        setClientSecret(data.clientSecret);
      } else {
        setError("Could not start payment. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h2 className="mb-3 text-xs uppercase tracking-widest text-muted">
        Upcoming events · {events.length}
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        {events.map((ev) => {
          const soldOut = ev.ticketsRemaining <= 0;
          const owned = ev.myTicket && ev.myTicket.status !== "cancelled";
          return (
            <button
              key={ev.id}
              type="button"
              onClick={() => openEvent(ev)}
              className="group flex flex-col overflow-hidden rounded-2xl border border-[--hair] bg-surface text-left transition-shadow hover:shadow-md"
            >
              <div className="flex h-28 items-center justify-center overflow-hidden bg-base">
                {ev.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={ev.imageUrl}
                    alt={ev.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-3xl">🎭</span>
                )}
              </div>
              <div className="flex flex-1 flex-col p-4">
                <p className="font-semibold text-ink">{ev.name}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {formatDate(ev.eventDate)}
                </p>
                {ev.venueName && (
                  <p className="mt-0.5 text-xs text-muted">📍 {ev.venueName}</p>
                )}
                <div className="mt-auto flex items-center justify-between pt-3">
                  <span className="font-black text-brand">
                    {ev.ticketPrice === 0 ? "Free" : NZD.format(ev.ticketPrice / 100)}
                  </span>
                  {owned ? (
                    <span className="rounded-full bg-[color-mix(in_srgb,#22c55e_18%,transparent)] px-2.5 py-0.5 text-[0.62rem] font-semibold uppercase tracking-wider text-emerald-600">
                      Ticket held
                    </span>
                  ) : soldOut ? (
                    <span className="text-xs text-muted">Sold out</span>
                  ) : (
                    <span className="text-xs font-semibold text-brand group-hover:underline">
                      {ev.ticketsRemaining} left →
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Event detail / purchase modal ─────────────────────────────────── */}
      <AnimatePresence>
        {active && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={close}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.3 }}
              className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-surface p-6 shadow-2xl"
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black text-ink">{active.name}</h3>
                  <p className="mt-0.5 text-xs text-muted">
                    {formatDate(active.eventDate)}
                  </p>
                  {active.venueName && (
                    <p className="mt-0.5 text-xs text-muted">
                      📍 {active.venueName}
                      {active.venueAddress ? ` — ${active.venueAddress}` : ""}
                    </p>
                  )}
                </div>
                <button
                  onClick={close}
                  className="text-lg text-muted hover:text-ink"
                >
                  ✕
                </button>
              </div>

              {qrCode ? (
                <div className="flex flex-col items-center text-center">
                  <p className="mb-3 font-semibold text-ink">
                    🎉 You&apos;re all set!
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrCode}
                    alt="Ticket QR code"
                    className="h-48 w-48 rounded-xl border border-[--hair] bg-white p-2"
                  />
                  <p className="mt-3 text-xs text-muted">
                    Present this QR code at the door. A copy is saved to your
                    account.
                  </p>
                  <button
                    onClick={close}
                    className="mt-4 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                  >
                    Done
                  </button>
                </div>
              ) : clientSecret ? (
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-sm text-muted">
                      {qty} ticket{qty > 1 ? "s" : ""}
                    </span>
                    <span className="text-lg font-black text-brand">
                      {NZD.format((active.ticketPrice * qty) / 100)}
                    </span>
                  </div>
                  <CheckoutForm
                    clientSecret={clientSecret}
                    submitLabel={`Pay ${NZD.format((active.ticketPrice * qty) / 100)}`}
                    onSuccess={() => {
                      setClientSecret(null);
                      setQrCode(pendingQr);
                    }}
                    onCancel={() => setClientSecret(null)}
                    cancelLabel="Back"
                  />
                </div>
              ) : (
                <>
                  {active.description && (
                    <p className="mb-4 text-sm text-muted">{active.description}</p>
                  )}

                  <div className="mb-4 flex items-center justify-between rounded-xl border border-[--hair] bg-base px-4 py-3">
                    <span className="text-sm font-medium text-ink">Tickets</span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setQty((q) => Math.max(1, q - 1))}
                        className="h-7 w-7 rounded-md border border-[--hair] text-muted hover:text-ink"
                      >
                        −
                      </button>
                      <span className="w-5 text-center text-sm font-semibold text-ink">
                        {qty}
                      </span>
                      <button
                        onClick={() =>
                          setQty((q) =>
                            Math.min(10, active.ticketsRemaining, q + 1),
                          )
                        }
                        className="h-7 w-7 rounded-md border border-[--hair] text-muted hover:text-ink disabled:opacity-30"
                        disabled={qty >= Math.min(10, active.ticketsRemaining)}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-sm text-muted">Total</span>
                    <span className="text-lg font-black text-brand">
                      {active.ticketPrice === 0
                        ? "Free"
                        : NZD.format((active.ticketPrice * qty) / 100)}
                    </span>
                  </div>

                  {error && (
                    <p className="mb-3 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-500">
                      {error}
                    </p>
                  )}

                  <button
                    onClick={buy}
                    disabled={busy || active.ticketsRemaining <= 0}
                    className="w-full rounded-xl bg-brand py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
                  >
                    {busy
                      ? "Processing…"
                      : active.ticketPrice === 0
                        ? "Reserve ticket"
                        : "Buy ticket →"}
                  </button>
                  {active.ticketPrice > 0 && (
                    <p className="mt-2 text-center text-[0.65rem] text-muted">
                      Card payment is collected at checkout.
                    </p>
                  )}
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </section>
  );
}
