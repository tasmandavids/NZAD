"use client";

// ============================================================================
//  EnrollModal — 4-step enrollment flow for parents.
//
//  Step 1: Select child + class (browse by day / discipline, capacity check)
//  Step 2: Sign studio waivers (required waivers only)
//  Step 3: Payment summary (invoice-based; Stripe card flow added in Phase 3)
//  Step 4: Confirmation
//
//  State machine: uses a simple step index + accumulated data object.
//  All server calls use the actions in /app/portal/parent/enroll/actions.ts.
// ============================================================================

import { useEffect, useRef, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Child } from "@/app/portal/parent/page";
import {
  getAvailableClasses,
  getActiveWaivers,
  signWaiver,
  enrollChildInClass,
  createEnrollmentIntent,
  type AvailableClass,
  type Waiver,
} from "@/app/portal/parent/enroll/actions";
import CheckoutForm from "@/components/payments/CheckoutForm";

// ─── Helpers ────────────────────────────────────────────────────────────────

const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const NZD = new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD" });

function fmtTime(t: string | null) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const p = h >= 12 ? "pm" : "am";
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""}${p}`;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StepIndicator({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="h-1.5 rounded-full transition-all duration-300"
          style={{
            width: i === step ? 24 : 8,
            background: i <= step ? "var(--brand)" : "var(--hair)",
          }}
        />
      ))}
    </div>
  );
}

function ClassCard({
  cls,
  selected,
  onSelect,
}: {
  cls: AvailableClass;
  selected: boolean;
  onSelect: () => void;
}) {
  const spotsLeft = cls.capacity - cls.enrolled;
  const isFull = spotsLeft <= 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-xl border p-4 text-left transition-all ${
        selected
          ? "border-[--brand] bg-[color-mix(in_srgb,var(--brand)_8%,transparent)]"
          : isFull
          ? "border-[--hair] bg-surface opacity-60 cursor-not-allowed"
          : "border-[--hair] bg-surface hover:border-[--brand]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-ink">{cls.name}</p>
          <p className="mt-0.5 text-xs text-muted">
            {cls.discipline}
            {cls.level ? ` · ${cls.level}` : ""}
          </p>
          <p className="mt-1 text-xs text-muted">
            {cls.dayOfWeek !== null ? DAY[cls.dayOfWeek] : ""}
            {cls.startTime ? ` · ${fmtTime(cls.startTime)}` : ""}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-ink">
            {cls.priceCents > 0 ? NZD.format(cls.priceCents / 100) : "Free"}
          </p>
          <p
            className="mt-1 text-[0.62rem] font-semibold uppercase tracking-wide"
            style={{ color: isFull ? "#ef4444" : spotsLeft <= 3 ? "var(--brand-hot)" : "var(--muted)" }}
          >
            {isFull ? "Full — waitlist" : `${spotsLeft} spot${spotsLeft !== 1 ? "s" : ""} left`}
          </p>
        </div>
      </div>
    </button>
  );
}

// ─── Step screens ────────────────────────────────────────────────────────────

type EnrollData = {
  childId: string;
  childName: string | null;
  classId: string;
  className: string;
  priceCents: number;
  waitlisted: boolean;
};

function Step1SelectClass({
  children,
  onNext,
}: {
  children: Child[];
  onNext: (data: { childId: string; childName: string | null; cls: AvailableClass }) => void;
}) {
  const [childId, setChildId] = useState(children[0]?.studentId ?? "");
  const [classes, setClasses] = useState<AvailableClass[]>([]);
  const [filter, setFilter] = useState("");
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAvailableClasses().then((res) => {
      if (res.ok) setClasses(res.data);
      else setError(res.error);
      setLoading(false);
    });
  }, []);

  const filtered = classes.filter((c) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.discipline?.toLowerCase().includes(q) ?? false) ||
      (c.level?.toLowerCase().includes(q) ?? false) ||
      (c.dayOfWeek !== null && DAY[c.dayOfWeek].toLowerCase().includes(q))
    );
  });

  const selectedCls = classes.find((c) => c.id === selectedClassId);
  const selectedChild = children.find((c) => c.studentId === childId);

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-base font-bold text-ink">Choose a class</h3>

      {/* Child selector */}
      {children.length > 1 && (
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">
            Enrolling for
          </label>
          <select
            value={childId}
            onChange={(e) => setChildId(e.target.value)}
            className="w-full rounded-lg border border-[--hair] bg-base px-3 py-2 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-[--brand]"
          >
            {children.map((c) => (
              <option key={c.studentId} value={c.studentId}>
                {c.name ?? "Unnamed dancer"}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Search */}
      <input
        type="text"
        placeholder="Search classes…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="w-full rounded-lg border border-[--hair] bg-base px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-[--brand]"
      />

      {/* Class list */}
      {loading ? (
        <div className="py-8 text-center text-sm text-muted animate-pulse">Loading classes…</div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted">No classes match your search.</div>
      ) : (
        <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
          {filtered.map((cls) => (
            <ClassCard
              key={cls.id}
              cls={cls}
              selected={selectedClassId === cls.id}
              onSelect={() => setSelectedClassId(cls.id)}
            />
          ))}
        </div>
      )}

      <button
        type="button"
        disabled={!selectedCls || !childId}
        onClick={() => {
          if (selectedCls) onNext({ childId, childName: selectedChild?.name ?? null, cls: selectedCls });
        }}
        className="mt-2 w-full rounded-xl py-3 text-sm font-bold text-white transition-opacity disabled:opacity-40"
        style={{ background: "var(--brand)" }}
      >
        Continue
      </button>
    </div>
  );
}

function Step2SignWaivers({
  childName,
  childId,
  onNext,
  onBack,
}: {
  childName: string | null;
  childId: string;
  onNext: () => void;
  onBack: () => void;
}) {
  const [waivers, setWaivers] = useState<Waiver[]>([]);
  const [agreed, setAgreed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, startSaving] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getActiveWaivers().then((res) => {
      if (res.ok) setWaivers(res.data);
      else setError(res.error);
      setLoading(false);
    });
  }, []);

  // If no waivers, skip this step automatically
  useEffect(() => {
    if (!loading && waivers.length === 0) onNext();
  }, [loading, waivers.length, onNext]);

  const allAgreed = waivers.every((w) => agreed.has(w.id));

  function handleSubmit() {
    startSaving(async () => {
      for (const w of waivers) {
        if (agreed.has(w.id)) {
          const res = await signWaiver(w.id, childId, w.version);
          if (!res.ok) { setError(res.error); return; }
        }
      }
      onNext();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-base font-bold text-ink">Studio waivers</h3>
      <p className="text-sm text-muted">
        Please read and accept the following on behalf of{" "}
        <strong>{childName ?? "your dancer"}</strong>.
      </p>

      {loading ? (
        <div className="py-8 text-center text-sm text-muted animate-pulse">Loading waivers…</div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>
      ) : waivers.length === 0 ? (
        <div className="rounded-lg border border-[--hair] bg-surface p-4 text-sm text-muted">
          No waivers required. Proceeding…
        </div>
      ) : (
        <div className="space-y-4">
          {waivers.map((w) => (
            <div key={w.id} className="rounded-xl border border-[--hair] bg-surface p-4">
              <p className="mb-2 font-semibold text-ink">{w.title}</p>
              <div className="mb-3 max-h-32 overflow-y-auto rounded-lg bg-base p-3 text-xs text-muted leading-relaxed whitespace-pre-wrap">
                {w.content}
              </div>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed.has(w.id)}
                  onChange={(e) => {
                    setAgreed((prev) => {
                      const next = new Set(prev);
                      if (e.target.checked) next.add(w.id);
                      else next.delete(w.id);
                      return next;
                    });
                  }}
                  className="mt-0.5 shrink-0 accent-[--brand]"
                />
                <span className="text-xs text-ink">
                  I agree to the <strong>{w.title}</strong> on behalf of my child.
                </span>
              </label>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-xl border border-[--hair] py-3 text-sm font-semibold text-muted transition-colors hover:border-[--brand] hover:text-ink"
        >
          Back
        </button>
        <button
          type="button"
          disabled={!allAgreed || saving}
          onClick={handleSubmit}
          className="flex-1 rounded-xl py-3 text-sm font-bold text-white transition-opacity disabled:opacity-40"
          style={{ background: "var(--brand)" }}
        >
          {saving ? "Signing…" : "Accept & Continue"}
        </button>
      </div>
    </div>
  );
}

function Step3Payment({
  childId,
  classId,
  enrollData,
  onComplete,
  onBack,
}: {
  childId: string;
  classId: string;
  enrollData: Pick<EnrollData, "childName" | "className" | "priceCents">;
  /** Fired once enrollment (and any payment) is finalised. */
  onComplete: (waitlisted: boolean) => void;
  onBack: () => void;
}) {
  const [phase, setPhase] = useState<"summary" | "pay">("summary");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPaid = enrollData.priceCents > 0;

  // Enroll first (reserves the spot + tells us waitlist status), then — for a
  // paid, non-waitlisted enrollment — create the invoice + PaymentIntent and
  // reveal the card form. Free or waitlisted enrollments skip payment.
  async function handleConfirm() {
    setBusy(true);
    setError(null);

    const res = await enrollChildInClass(childId, classId);
    if (!res.ok) { setError(res.error); setBusy(false); return; }

    if (res.data.waitlisted || !isPaid) {
      onComplete(res.data.waitlisted);
      return;
    }

    const intentRes = await createEnrollmentIntent(
      childId,
      classId,
      enrollData.className,
      enrollData.priceCents,
    );
    if (!intentRes.ok) { setError(intentRes.error); setBusy(false); return; }

    setClientSecret(intentRes.data.clientSecret);
    setPhase("pay");
    setBusy(false);
  }

  // ── Card capture phase ─────────────────────────────────────────────────────
  if (phase === "pay" && clientSecret) {
    return (
      <div className="flex flex-col gap-4">
        <h3 className="text-base font-bold text-ink">Payment</h3>
        <div className="flex items-center justify-between rounded-xl border border-[--hair] bg-surface px-4 py-3">
          <span className="text-sm text-muted">{enrollData.className}</span>
          <span className="font-black text-ink">{NZD.format(enrollData.priceCents / 100)}</span>
        </div>
        <CheckoutForm
          clientSecret={clientSecret}
          submitLabel={`Pay ${NZD.format(enrollData.priceCents / 100)}`}
          onSuccess={() => onComplete(false)}
        />
        <p className="text-center text-[0.65rem] text-muted">
          Your spot is reserved. Payment confirms your enrollment.
        </p>
      </div>
    );
  }

  // ── Summary phase ──────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-base font-bold text-ink">Payment summary</h3>

      <div className="rounded-xl border border-[--hair] bg-surface p-5 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted">Class</span>
          <span className="font-semibold text-ink">{enrollData.className}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted">Dancer</span>
          <span className="font-semibold text-ink">{enrollData.childName ?? "—"}</span>
        </div>
        <div className="my-2 border-t border-[--hair]" />
        <div className="flex justify-between">
          <span className="font-bold text-ink">Total due</span>
          <span className="font-black text-ink">
            {isPaid ? NZD.format(enrollData.priceCents / 100) : "Free"}
          </span>
        </div>
      </div>

      {isPaid && (
        <div className="rounded-lg border border-[--hair] bg-base p-3 text-xs text-muted">
          You&apos;ll enter your card details on the next step. If the class is full
          you&apos;ll be waitlisted and no payment is taken.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={busy}
          className="flex-1 rounded-xl border border-[--hair] py-3 text-sm font-semibold text-muted transition-colors hover:border-[--brand] hover:text-ink disabled:opacity-40"
        >
          Back
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={handleConfirm}
          className="flex-1 rounded-xl py-3 text-sm font-bold text-white transition-opacity disabled:opacity-40"
          style={{ background: "var(--brand)" }}
        >
          {busy ? "Processing…" : isPaid ? "Continue to payment" : "Confirm Enrollment"}
        </button>
      </div>
    </div>
  );
}

function Step4Confirmation({
  enrollData,
  onClose,
}: {
  enrollData: EnrollData;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-5 py-4 text-center">
      <div
        className="grid h-16 w-16 place-items-center rounded-full text-2xl"
        style={{ background: "color-mix(in srgb, var(--brand) 12%, transparent)" }}
      >
        {enrollData.waitlisted ? "⏳" : "🎉"}
      </div>
      <div>
        <h3 className="text-lg font-black text-ink">
          {enrollData.waitlisted ? "Added to waitlist!" : "Enrolled!"}
        </h3>
        <p className="mt-1 text-sm text-muted">
          {enrollData.waitlisted
            ? `${enrollData.childName ?? "Your dancer"} is on the waitlist for ${enrollData.className}. You'll be notified when a spot opens.`
            : `${enrollData.childName ?? "Your dancer"} is now enrolled in ${enrollData.className}.`}
        </p>
        {enrollData.priceCents > 0 && !enrollData.waitlisted && (
          <p className="mt-2 text-xs text-muted">
            An invoice for {NZD.format(enrollData.priceCents / 100)} will appear in your account shortly.
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="rounded-xl px-8 py-3 text-sm font-bold text-white"
        style={{ background: "var(--brand)" }}
      >
        Done
      </button>
    </div>
  );
}

// ─── Main modal ──────────────────────────────────────────────────────────────

const STEPS = ["Select class", "Waivers", "Payment", "Done"];

export function EnrollModal({
  children,
  onClose,
}: {
  children: Child[];
  onClose: () => void;
}) {
  const [step, setStep] = useState(0);
  const [enrollData, setEnrollData] = useState<Partial<EnrollData>>({});
  const backdropRef = useRef<HTMLDivElement>(null);

  // Close on backdrop click
  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === backdropRef.current) onClose();
  }

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md rounded-2xl border border-[--hair] bg-base shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[--hair] px-6 py-4">
          <div>
            <p className="text-[0.62rem] font-semibold uppercase tracking-wider text-muted">
              Enrollment
            </p>
            <p className="text-sm font-bold text-ink">{STEPS[step]}</p>
          </div>
          <div className="flex items-center gap-4">
            <StepIndicator step={step} total={STEPS.length} />
            <button
              type="button"
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-full text-muted transition-colors hover:bg-surface hover:text-ink"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.18 }}
            >
              {step === 0 && (
                <Step1SelectClass
                  children={children}
                  onNext={({ childId, childName, cls }) => {
                    setEnrollData({ childId, childName, classId: cls.id, className: cls.name, priceCents: cls.priceCents });
                    setStep(1);
                  }}
                />
              )}
              {step === 1 && (
                <Step2SignWaivers
                  childName={enrollData.childName ?? null}
                  childId={enrollData.childId!}
                  onNext={() => setStep(2)}
                  onBack={() => setStep(0)}
                />
              )}
              {step === 2 && (
                <Step3Payment
                  childId={enrollData.childId!}
                  classId={enrollData.classId!}
                  enrollData={{
                    childName: enrollData.childName ?? null,
                    className: enrollData.className!,
                    priceCents: enrollData.priceCents!,
                  }}
                  onComplete={(waitlisted) => {
                    setEnrollData((prev) => ({ ...prev, waitlisted }));
                    setStep(3);
                  }}
                  onBack={() => setStep(1)}
                />
              )}
              {step === 3 && enrollData.childId && enrollData.classId && (
                <Step4Confirmation
                  enrollData={enrollData as EnrollData}
                  onClose={onClose}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
