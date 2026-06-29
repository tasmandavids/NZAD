"use client";

import { useRef, useState, useTransition } from "react";
import { sendInquiry } from "@/app/instructor/[slug]/inquire/actions";

const COMMON_ENGAGEMENT_TYPES = [
  "One-off cover", "Workshop", "Week intensive", "Summer school", "Residency",
];

export function InquiryForm({
  instructorProfileId,
  studioId,
  instructorName,
  engagementTypes,
  backHref,
}: {
  instructorProfileId: string;
  studioId: string;
  instructorName: string;
  engagementTypes: string[];
  backHref: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const options =
    engagementTypes.length > 0 ? engagementTypes : COMMON_ENGAGEMENT_TYPES;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    setError(null);
    startTransition(async () => {
      const res = await sendInquiry(fd);
      if (res && "error" in res) setError(res.error);
      // on success the action redirects
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
      <input type="hidden" name="instructorProfileId" value={instructorProfileId} />
      <input type="hidden" name="studioId" value={studioId} />

      <div className="px-5 py-4">
        <h2 className="text-base font-semibold text-gray-900">Send inquiry to {instructorName}</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Describe what you&apos;re looking for. The instructor will be notified and can respond directly.
        </p>
      </div>

      <div className="px-5 py-4 space-y-1">
        <label className="block text-sm font-medium text-gray-700">Subject</label>
        <input
          name="subject"
          required
          maxLength={200}
          placeholder="e.g. Guest teacher for July winter intensive"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="px-5 py-4 space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          Engagement type <span className="font-normal text-gray-400">(optional)</span>
        </label>
        <select
          name="engagementType"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Select…</option>
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </div>

      <div className="px-5 py-4 space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          Proposed dates <span className="font-normal text-gray-400">(optional)</span>
        </label>
        <input
          name="proposedDates"
          maxLength={200}
          placeholder="e.g. 14–18 July 2026"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="px-5 py-4 space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          Location <span className="font-normal text-gray-400">(optional)</span>
        </label>
        <input
          name="location"
          maxLength={200}
          placeholder="e.g. Auckland, New Zealand"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="px-5 py-4 space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          Proposed rate (NZD/day) <span className="font-normal text-gray-400">(optional)</span>
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
          <input
            type="number"
            name="proposedRateNzd"
            min={0}
            max={99999}
            placeholder="500"
            className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="px-5 py-4 space-y-1">
        <label className="block text-sm font-medium text-gray-700">Message</label>
        <textarea
          name="message"
          required
          minLength={10}
          maxLength={3000}
          rows={6}
          placeholder="Tell the instructor about your studio, what you need, and any other relevant details…"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />
      </div>

      {error && (
        <div className="px-5 py-3 bg-red-50">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="px-5 py-4 flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {pending ? "Sending…" : "Send inquiry"}
        </button>
        <a
          href={backHref}
          className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
