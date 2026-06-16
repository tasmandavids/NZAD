"use client";

// ============================================================================
//  EnrolPage — "Book a free trial" form stub.
//  Full implementation: class selector → guardian details → Stripe payment.
//  For now: captures name + email + class interest → shows confirmation.
// ============================================================================

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function EnrolPage({
  studioName,
  tagline,
}: {
  studioName: string;
  tagline: string | null;
}) {
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [interest, setInterest] = useState("");
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: POST to an API route or an email service (Resend, Postmark, etc.)
    // For now, just show confirmation so the UX is complete.
    startTransition(async () => {
      await new Promise((r) => setTimeout(r, 600)); // simulate network
      setSubmitted(true);
    });
  };

  const DISCIPLINES = [
    "Ballet", "Contemporary", "Jazz", "Hip-Hop", "Tap", "Lyrical", "Acro", "Pointe",
    "Not sure yet",
  ];

  return (
    <div className="grid min-h-screen place-items-center bg-base p-6 text-ink">
      <div className="w-full max-w-md">
        {/* Studio identity */}
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-widest text-muted">
            {tagline ?? studioName}
          </p>
          <h1 className="mt-2 text-3xl font-black uppercase tracking-tight">
            Book a free trial
          </h1>
          <p className="mt-2 text-sm text-muted">
            No commitment. We'll contact you to arrange the best class for your dancer.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-3xl border border-[--hair] bg-surface p-8 text-center shadow-2xl"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.1 }}
                className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full text-2xl text-white"
                style={{ background: "var(--brand)" }}
              >
                ✓
              </motion.div>
              <h2 className="text-xl font-black">You're on the list!</h2>
              <p className="mt-2 text-sm text-muted">
                We'll be in touch soon, <strong className="text-ink">{name.split(" ")[0]}</strong>.
                Keep an eye on <span className="text-ink">{email}</span>.
              </p>
              <a
                href="/"
                className="btn-glow btn-glow--solid mt-6 inline-flex justify-center px-6 py-3 text-sm"
              >
                Back to home
              </a>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              onSubmit={onSubmit}
              className="rounded-3xl border border-[--hair] bg-surface p-7 shadow-2xl"
            >
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">
                    Your name
                  </span>
                  <input
                    type="text"
                    required
                    className="field-premium"
                    placeholder="Jane Smith"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">
                    Email address
                  </span>
                  <input
                    type="email"
                    required
                    className="field-premium"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>

                <div>
                  <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted">
                    Dance style interest
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {DISCIPLINES.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setInterest(d)}
                        className="rounded-full border px-3 py-1.5 text-xs font-medium transition-all"
                        style={{
                          borderColor: interest === d ? "var(--brand)" : "var(--hair)",
                          background: interest === d ? "var(--brand)" : "transparent",
                          color: interest === d ? "#fff" : "var(--muted)",
                        }}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={pending || !name.trim() || !email.trim()}
                className="btn-glow btn-glow--solid mt-6 w-full justify-center disabled:opacity-50"
              >
                {pending ? "Sending…" : "Request my free trial →"}
              </button>

              <p className="mt-4 text-center text-xs text-muted">
                Already have an account?{" "}
                <a href="/login" className="text-ink underline">
                  Sign in
                </a>
              </p>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
