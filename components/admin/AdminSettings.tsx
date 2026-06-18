"use client";

// ============================================================================
//  AdminSettings — Studio settings form.
//  Currently: edit studio name. Slug + custom domain shown as read-only info.
// ============================================================================

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import {
  updateStudioName,
  updateSiblingDiscount,
  updateFamilyRetailDiscount,
  updateStudioTimezone,
} from "@/app/portal/admin/settings/actions";

const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "olune.app";

// Common IANA timezones for the studio picker. Admins can self-host more by
// extending this list; the server action accepts any valid IANA name.
const TIMEZONES = [
  "Pacific/Auckland",
  "Australia/Sydney",
  "Australia/Perth",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Dubai",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "UTC",
];

type StudioInfo = {
  id: string;
  name: string;
  slug: string;
  customDomain: string | null;
  status: string;
  createdAt: string;
  siblingDiscountPct: number;
  familyDiscountOnRetail: boolean;
  timezone: string;
};

export default function AdminSettings({ studio }: { studio: StudioInfo | null }) {
  const [name, setName] = useState(studio?.name ?? "");
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);

  const [discount, setDiscount] = useState(String(studio?.siblingDiscountPct ?? 0));
  const [discountPending, startDiscountTransition] = useTransition();
  const [discountStatus, setDiscountStatus] = useState<string | null>(null);

  const [retailDiscount, setRetailDiscount] = useState(studio?.familyDiscountOnRetail ?? false);
  const [retailPending, startRetailTransition] = useTransition();
  const [retailStatus, setRetailStatus] = useState<string | null>(null);

  const [timezone, setTimezone] = useState(studio?.timezone ?? "Pacific/Auckland");
  const [tzPending, startTzTransition] = useTransition();
  const [tzStatus, setTzStatus] = useState<string | null>(null);

  const onSave = () =>
    startTransition(async () => {
      const res = await updateStudioName({ name });
      setStatus(res.ok ? "Saved" : res.ok === false ? res.error : "Error");
      setTimeout(() => setStatus(null), 2500);
    });

  const onSaveDiscount = () =>
    startDiscountTransition(async () => {
      const res = await updateSiblingDiscount({ pct: Number(discount) });
      setDiscountStatus(res.ok ? "Saved" : res.error);
      setTimeout(() => setDiscountStatus(null), 2500);
    });

  const onToggleRetail = (enabled: boolean) => {
    setRetailDiscount(enabled);
    startRetailTransition(async () => {
      const res = await updateFamilyRetailDiscount({ enabled });
      if (!res.ok) {
        setRetailDiscount(!enabled); // revert on failure
        setRetailStatus(res.error);
      } else {
        setRetailStatus("Saved");
      }
      setTimeout(() => setRetailStatus(null), 2500);
    });
  };

  const onSaveTimezone = () =>
    startTzTransition(async () => {
      const res = await updateStudioTimezone({ timezone });
      setTzStatus(res.ok ? "Saved" : res.error);
      setTimeout(() => setTzStatus(null), 2500);
    });

  if (!studio) {
    return (
      <div className="grid min-h-screen place-items-center p-8 text-ink">
        <p className="text-sm text-muted">Studio not found.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto max-w-2xl space-y-10 p-6"
    >
      {/* Header */}
      <header>
        <h1 className="text-xl font-bold text-ink">Studio settings</h1>
        <p className="text-sm text-muted">Manage your studio's identity and configuration.</p>
      </header>

      {/* Identity card */}
      <section className="space-y-6 rounded-2xl border border-[--hair] bg-surface p-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">Identity</h2>

        {/* Studio name */}
        <div className="space-y-2">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-ink">Studio name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="field-premium"
              placeholder="My Dance Studio"
            />
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={onSave}
              disabled={pending || !name.trim() || name.trim() === studio.name}
              className="btn-glow btn-glow--solid px-5 py-2 text-sm disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save name"}
            </button>
            {status && (
              <p
                className="text-sm"
                style={{ color: status === "Saved" ? "var(--brand-hot)" : "#ef4444" }}
              >
                {status === "Saved" ? "Name updated." : status}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Billing — sibling discount */}
      <section className="space-y-6 rounded-2xl border border-[--hair] bg-surface p-6">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">Billing</h2>
          <p className="mt-1 text-sm text-muted">
            Sibling / family discount applied at checkout when a family enrols a 2nd+ student. Set to 0 to disable.
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-ink">Sibling discount (%)</span>
            <input
              type="number"
              min={0}
              max={100}
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              className="field-premium"
              placeholder="e.g. 10"
            />
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={onSaveDiscount}
              disabled={
                discountPending ||
                discount.trim() === "" ||
                Number(discount) === studio.siblingDiscountPct
              }
              className="btn-glow btn-glow--solid px-5 py-2 text-sm disabled:opacity-50"
            >
              {discountPending ? "Saving…" : "Save discount"}
            </button>
            {discountStatus && (
              <p
                className="text-sm"
                style={{ color: discountStatus === "Saved" ? "var(--brand-hot)" : "#ef4444" }}
              >
                {discountStatus === "Saved" ? "Discount updated." : discountStatus}
              </p>
            )}
          </div>
        </div>

        {/* Extend the discount to merch + event tickets (opt-in) */}
        <div className="space-y-2 border-t border-[--hair] pt-5">
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={retailDiscount}
              disabled={retailPending}
              onChange={(e) => onToggleRetail(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[--brand]"
            />
            <span>
              <span className="block font-medium text-ink">Also apply to shop &amp; event tickets</span>
              <span className="block text-muted">
                When on, the discount above is applied to merchandise orders and event-ticket
                purchases for families with an active enrolment.
              </span>
            </span>
          </label>
          {retailStatus && (
            <p
              className="pl-7 text-sm"
              style={{ color: retailStatus === "Saved" ? "var(--brand-hot)" : "#ef4444" }}
            >
              {retailStatus === "Saved" ? "Saved." : retailStatus}
            </p>
          )}
        </div>
      </section>

      {/* Localization — timezone */}
      <section className="space-y-6 rounded-2xl border border-[--hair] bg-surface p-6">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">Localization</h2>
          <p className="mt-1 text-sm text-muted">
            Your studio's timezone. Class reminders, birthday greetings and overdue-invoice
            sweeps are scheduled in this local time.
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-ink">Timezone</span>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="field-premium"
            >
              {!TIMEZONES.includes(timezone) && <option value={timezone}>{timezone}</option>}
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={onSaveTimezone}
              disabled={tzPending || timezone === studio.timezone}
              className="btn-glow btn-glow--solid px-5 py-2 text-sm disabled:opacity-50"
            >
              {tzPending ? "Saving…" : "Save timezone"}
            </button>
            {tzStatus && (
              <p
                className="text-sm"
                style={{ color: tzStatus === "Saved" ? "var(--brand-hot)" : "#ef4444" }}
              >
                {tzStatus === "Saved" ? "Timezone updated." : tzStatus}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Read-only info */}
      <section className="space-y-4 rounded-2xl border border-[--hair] bg-surface p-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">URLs & status</h2>

        <InfoRow label="Subdomain URL">
          <code className="rounded bg-base px-2 py-0.5 text-xs text-ink">
            {studio.slug}.{ROOT}
          </code>
        </InfoRow>

        {studio.customDomain && (
          <InfoRow label="Custom domain">
            <code className="rounded bg-base px-2 py-0.5 text-xs text-ink">
              {studio.customDomain}
            </code>
          </InfoRow>
        )}

        <InfoRow label="Status">
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.62rem] font-semibold uppercase tracking-wider text-white"
            style={{
              background:
                studio.status === "active"
                  ? "#22c55e"
                  : studio.status === "trial"
                  ? "var(--brand)"
                  : "#8b8b92",
            }}
          >
            {studio.status}
          </span>
        </InfoRow>

        <InfoRow label="Created">
          <span className="text-sm text-muted">
            {new Date(studio.createdAt).toLocaleDateString("en-NZ", {
              day: "numeric", month: "long", year: "numeric",
            })}
          </span>
        </InfoRow>

        <InfoRow label="Studio ID">
          <code className="text-[0.62rem] text-muted">{studio.id}</code>
        </InfoRow>
      </section>

      {/* Custom domain */}
      <section className="rounded-2xl border border-dashed border-[--hair] p-5">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">Custom domain</h2>
        <p className="text-sm text-muted leading-relaxed">
          Connect your own domain (e.g. <code className="text-ink">www.mystudio.co.nz</code>) with our step-by-step
          guide — no DNS jargon required.
        </p>
        <a
          href="/portal/admin/site/domain"
          className="mt-3 inline-flex rounded-full border border-brand/40 px-4 py-2 text-sm font-medium text-brand transition hover:bg-brand/10"
        >
          Open domain setup wizard →
        </a>
      </section>
    </motion.div>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[--hair] pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-muted">{label}</span>
      <div>{children}</div>
    </div>
  );
}
