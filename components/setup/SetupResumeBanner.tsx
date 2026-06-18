"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { resumeSetup } from "@/app/setup/actions";
import type { SetupStepId } from "@/lib/setup/constants";
import { SETUP_STEPS } from "@/lib/setup/constants";

export function SetupResumeBanner({
  setupStep,
  snoozed,
}: {
  setupStep: SetupStepId | null;
  snoozed: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const stepLabel =
    SETUP_STEPS.find((s) => s.id === setupStep)?.label ?? "Get started";

  function onResume() {
    startTransition(async () => {
      if (snoozed) await resumeSetup();
      router.push("/setup");
      router.refresh();
    });
  }

  return (
    <div className="border-b border-brand/25 bg-brand/8 px-4 py-3 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">Finish setting up your studio</p>
          <p className="text-xs text-muted">
            You paused at <span className="text-ink">{stepLabel}</span> — pick up where you left off.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            href="/setup"
            className="rounded-full border border-[--hair] px-4 py-1.5 text-xs font-semibold text-muted hover:text-ink"
          >
            Open wizard
          </Link>
          <button
            type="button"
            onClick={onResume}
            disabled={pending}
            className="rounded-full bg-brand px-4 py-1.5 text-xs font-bold text-white disabled:opacity-60"
          >
            {pending ? "Opening…" : "Resume setup"}
          </button>
        </div>
      </div>
    </div>
  );
}
