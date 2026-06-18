"use client";

// Minimal starter sign-in. Middleware routes you to the right /portal/<role>.

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const next = useSearchParams()?.get("next") ?? "/portal";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setError(error.message);
    router.replace(next);
    router.refresh();
  }

  return (
    <div className="grid min-h-screen place-items-center bg-base px-5 text-ink">
      <form onSubmit={signIn} className="w-full max-w-sm rounded-3xl border border-[--hair] bg-surface p-7 shadow-2xl">
        <h1 className="text-2xl font-black tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-muted">Sign in to your studio.</p>
        {error && <p className="mt-4 rounded-lg border border-[--hair] bg-base/50 px-3 py-2 text-sm text-red-400">{error}</p>}
        <div className="mt-6 space-y-3">
          <input className="field-premium" type="email" required placeholder="you@studio.co.nz" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="field-premium" type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button type="submit" disabled={busy} className="btn-glow btn-glow--solid mt-6 w-full justify-center disabled:opacity-60">
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <p className="mt-4 text-center text-sm text-muted">
          New studio? <a href="/onboarding" className="text-ink underline">Get started</a>
        </p>
        <p className="mt-3 text-center text-xs text-muted">
          Olune platform admin?{" "}
          <a href="/login?next=/platform" className="text-ink underline">
            Sign in to /platform
          </a>
        </p>
      </form>
    </div>
  );
}
