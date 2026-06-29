"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import type { DirectoryInstructor } from "@/app/instructors/page";

const DISCIPLINES = [
  "Ballet", "Contemporary", "Jazz", "Hip Hop", "Tap", "Lyrical",
  "Acro", "Musical Theatre", "Ballroom", "Latin", "Yoga", "Pilates",
  "Gymnastics", "Cheer", "Aerial", "Barre",
];

const AVAILABILITY_TYPES = ["Local cover", "Regional", "International travel"];
const ENGAGEMENT_TYPES   = ["One-off cover", "Workshop", "Week intensive", "Summer school", "Residency"];

type Filters = {
  discipline:   string | null;
  availability: string | null;
  engagement:   string | null;
};

export function InstructorDirectory({
  instructors,
  activeFilters,
}: {
  instructors: DirectoryInstructor[];
  activeFilters: Filters;
}) {
  const router    = useRouter();
  const pathname  = usePathname();
  const params    = useSearchParams();

  const setFilter = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      router.push(`${pathname}?${next.toString()}`);
    },
    [pathname, params, router]
  );

  const clearAll = () => router.push(pathname);

  const hasFilters =
    activeFilters.discipline || activeFilters.availability || activeFilters.engagement;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700">Filter instructors</p>
          {hasFilters && (
            <button onClick={clearAll} className="text-xs text-indigo-600 hover:underline">
              Clear all
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FilterSelect
            label="Discipline"
            value={activeFilters.discipline}
            options={DISCIPLINES}
            onChange={(v) => setFilter("discipline", v)}
          />
          <FilterSelect
            label="Availability"
            value={activeFilters.availability}
            options={AVAILABILITY_TYPES}
            onChange={(v) => setFilter("availability", v)}
          />
          <FilterSelect
            label="Engagement type"
            value={activeFilters.engagement}
            options={ENGAGEMENT_TYPES}
            onChange={(v) => setFilter("engagement", v)}
          />
        </div>
      </div>

      {/* Results */}
      <p className="text-xs text-gray-400">
        {instructors.length === 0
          ? "No instructors match these filters."
          : `${instructors.length} instructor${instructors.length !== 1 ? "s" : ""}`}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {instructors.map((inst) => (
          <InstructorCard key={inst.slug} instructor={inst} />
        ))}
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | null;
  options: string[];
  onChange: (v: string | null) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

function InstructorCard({ instructor: i }: { instructor: DirectoryInstructor }) {
  const rateLabel =
    i.rateMinNzd && i.rateMaxNzd
      ? `NZD $${i.rateMinNzd}–$${i.rateMaxNzd}/day`
      : i.rateMinNzd
      ? `From NZD $${i.rateMinNzd}/day`
      : null;

  return (
    <a
      href={`/instructor/${i.slug}`}
      className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-indigo-300 hover:shadow-md transition-all flex flex-col"
    >
      {/* Header band */}
      <div className="h-14 bg-gradient-to-r from-indigo-500 to-purple-600 relative" />

      <div className="px-4 pb-4 flex-1 flex flex-col">
        {/* Avatar */}
        <div className="-mt-8 mb-2 flex items-end justify-between">
          <div className="flex items-end gap-2">
            {i.avatarUrl ? (
              <img
                src={i.avatarUrl}
                alt={i.fullName}
                className="h-14 w-14 rounded-full border-4 border-white object-cover shadow-sm"
              />
            ) : (
              <div className="h-14 w-14 rounded-full border-4 border-white bg-indigo-100 flex items-center justify-center shadow-sm">
                <span className="text-lg font-bold text-indigo-600">
                  {i.fullName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          {i.networkVerified && (
            <span className="text-xs bg-green-50 text-green-700 border border-green-200 rounded-full px-2 py-0.5 font-medium">
              Verified
            </span>
          )}
        </div>

        {/* Name & headline */}
        <p className="font-semibold text-gray-900 text-sm leading-snug group-hover:text-indigo-700 transition-colors">
          {i.fullName}
        </p>
        {i.headline && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{i.headline}</p>
        )}
        {i.locationCity && (
          <p className="text-xs text-gray-400 mt-1">📍 {i.locationCity}</p>
        )}

        {/* Disciplines */}
        {i.disciplines.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {i.disciplines.slice(0, 4).map((d) => (
              <span key={d} className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full">
                {d}
              </span>
            ))}
            {i.disciplines.length > 4 && (
              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                +{i.disciplines.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Availability + rate */}
        <div className="mt-auto pt-3 space-y-1">
          {i.availabilityType.length > 0 && (
            <p className="text-xs text-gray-500">
              {i.availabilityType.join(" · ")}
            </p>
          )}
          {rateLabel && (
            <p className="text-xs font-medium text-gray-700">{rateLabel}</p>
          )}
        </div>
      </div>
    </a>
  );
}
