"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { InstructorProfileData } from "@/app/portal/teacher/profile/page";
import { updateInstructorProfile } from "@/app/portal/teacher/profile/actions";

const COMMON_DISCIPLINES = [
  "Ballet", "Contemporary", "Jazz", "Hip Hop", "Tap", "Lyrical",
  "Acro", "Musical Theatre", "Ballroom", "Latin", "Salsa", "Yoga",
  "Pilates", "Gymnastics", "Cheer", "Aerial", "Barre",
];

const SYLLABUS_CERTS = [
  "RAD", "ISTD", "CSTD", "NZAMD", "BATD", "Cecchetti", "ADAPT", "BBO",
];

const AGE_GROUPS = [
  "Early childhood (0–5)", "Primary (5–12)", "Secondary (13–18)",
  "Adult", "Vocational / pre-professional",
];

const ENGAGEMENT_TYPES = [
  "One-off cover", "Workshop", "Week intensive", "Summer school", "Residency",
];

const AVAILABILITY_TYPES = [
  "Local cover", "Regional", "International travel",
];

function TagSelector({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  function toggle(v: string) {
    onChange(
      selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]
    );
  }
  return (
    <div className="px-5 py-4 space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => toggle(o)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              selected.includes(o)
                ? "bg-indigo-600 border-indigo-600 text-white"
                : "bg-white border-gray-300 text-gray-600 hover:border-indigo-400"
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

export function InstructorProfileEditor({ profile }: { profile: InstructorProfileData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [form, setForm] = useState({
    fullName:             profile.fullName,
    headline:             profile.headline ?? "",
    bio:                  profile.bio ?? "",
    disciplines:          profile.disciplines,
    syllabusСerts:        profile.syllabusСerts,
    trainingInstitutions: profile.trainingInstitutions,
    ageGroups:            profile.ageGroups,
    engagementTypes:      profile.engagementTypes,
    availabilityType:     profile.availabilityType,
    teachingVideoUrl:     profile.teachingVideoUrl ?? "",
    rateMinNzd:           profile.rateMinNzd?.toString() ?? "",
    rateMaxNzd:           profile.rateMaxNzd?.toString() ?? "",
    locationCity:         profile.locationCity ?? "",
    websiteUrl:           profile.websiteUrl ?? "",
    avatarUrl:            profile.avatarUrl ?? "",
    profilePublic:        profile.profilePublic,
  });

  const [customDiscipline, setCustomDiscipline] = useState("");
  const [customInstitution, setCustomInstitution] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved]  = useState(false);

  function toggleDiscipline(d: string) {
    setForm((f) => ({
      ...f,
      disciplines: f.disciplines.includes(d)
        ? f.disciplines.filter((x) => x !== d)
        : [...f.disciplines, d],
    }));
  }

  function addCustomDiscipline() {
    const d = customDiscipline.trim();
    if (!d || form.disciplines.includes(d)) return;
    setForm((f) => ({ ...f, disciplines: [...f.disciplines, d] }));
    setCustomDiscipline("");
  }

  function addCustomInstitution() {
    const v = customInstitution.trim();
    if (!v || form.trainingInstitutions.includes(v)) return;
    setForm((f) => ({ ...f, trainingInstitutions: [...f.trainingInstitutions, v] }));
    setCustomInstitution("");
  }

  function handleSave() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await updateInstructorProfile({
        full_name:             form.fullName,
        headline:              form.headline || undefined,
        bio:                   form.bio || undefined,
        disciplines:           form.disciplines,
        syllabus_certs:        form.syllabusСerts,
        training_institutions: form.trainingInstitutions,
        age_groups:            form.ageGroups,
        engagement_types:      form.engagementTypes,
        availability_type:     form.availabilityType,
        teaching_video_url:    form.teachingVideoUrl || undefined,
        rate_min_nzd:          form.rateMinNzd ? parseInt(form.rateMinNzd, 10) : undefined,
        rate_max_nzd:          form.rateMaxNzd ? parseInt(form.rateMaxNzd, 10) : undefined,
        location_city:         form.locationCity || undefined,
        website_url:           form.websiteUrl || undefined,
        avatar_url:            form.avatarUrl || undefined,
        profile_public:        form.profilePublic,
      });
      if (res.error) { setError(res.error); return; }
      setSaved(true);
      router.refresh();
    });
  }

  const publicUrl = profile.slug ? `/instructor/${profile.slug}` : null;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Public profile</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            How you appear to studios and clients on the Olune Network
          </p>
        </div>
        {publicUrl && form.profilePublic && (
          <a href={publicUrl} target="_blank" rel="noopener noreferrer"
            className="text-sm text-indigo-600 hover:underline">
            View public profile →
          </a>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">

        {/* Visibility */}
        <div className="px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Make profile public</p>
            <p className="text-xs text-gray-500 mt-0.5">Appear in the Olune Network instructor directory</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={form.profilePublic}
            onClick={() => setForm((f) => ({ ...f, profilePublic: !f.profilePublic }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.profilePublic ? "bg-indigo-600" : "bg-gray-200"}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.profilePublic ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>

        {/* Name */}
        <div className="px-5 py-4 space-y-1">
          <label className="block text-sm font-medium text-gray-700">Full name</label>
          <input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>

        {/* Headline */}
        <div className="px-5 py-4 space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Headline <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <input value={form.headline} onChange={(e) => setForm((f) => ({ ...f, headline: e.target.value }))}
            maxLength={160} placeholder="e.g. Ballet & contemporary instructor · RAD certified"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <p className="text-xs text-gray-400">{form.headline.length}/160</p>
        </div>

        {/* Bio */}
        <div className="px-5 py-4 space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Bio <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <textarea value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            rows={5} maxLength={2000}
            placeholder="Your background, training, and teaching style…"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
          <p className="text-xs text-gray-400">{form.bio.length}/2000</p>
        </div>

        {/* Disciplines */}
        <div className="px-5 py-4 space-y-2">
          <label className="block text-sm font-medium text-gray-700">Disciplines</label>
          <div className="flex flex-wrap gap-2">
            {COMMON_DISCIPLINES.map((d) => (
              <button key={d} type="button" onClick={() => toggleDiscipline(d)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  form.disciplines.includes(d)
                    ? "bg-indigo-600 border-indigo-600 text-white"
                    : "bg-white border-gray-300 text-gray-600 hover:border-indigo-400"
                }`}>
                {d}
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <input value={customDiscipline} onChange={(e) => setCustomDiscipline(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomDiscipline(); } }}
              placeholder="Add other…"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <button type="button" onClick={addCustomDiscipline}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Add</button>
          </div>
          {form.disciplines.filter((d) => !COMMON_DISCIPLINES.includes(d)).map((d) => (
            <span key={d} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-indigo-600 text-white mr-1">
              {d}
              <button type="button" onClick={() => toggleDiscipline(d)} className="ml-1 opacity-70 hover:opacity-100">×</button>
            </span>
          ))}
        </div>

        {/* Syllabus certs */}
        <TagSelector
          label="Syllabus certifications"
          options={SYLLABUS_CERTS}
          selected={form.syllabusСerts}
          onChange={(v) => setForm((f) => ({ ...f, syllabusСerts: v }))}
        />

        {/* Training institutions */}
        <div className="px-5 py-4 space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Training institutions <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <div className="flex gap-2">
            <input value={customInstitution} onChange={(e) => setCustomInstitution(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomInstitution(); } }}
              placeholder="e.g. Vaganova Academy, NZSD, VCA"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <button type="button" onClick={addCustomInstitution}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Add</button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {form.trainingInstitutions.map((v) => (
              <span key={v} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                {v}
                <button type="button"
                  onClick={() => setForm((f) => ({ ...f, trainingInstitutions: f.trainingInstitutions.filter((x) => x !== v) }))}
                  className="ml-1 opacity-70 hover:opacity-100">×</button>
              </span>
            ))}
          </div>
        </div>

        {/* Age groups */}
        <TagSelector
          label="Age groups taught"
          options={AGE_GROUPS}
          selected={form.ageGroups}
          onChange={(v) => setForm((f) => ({ ...f, ageGroups: v }))}
        />

        {/* Engagement types */}
        <TagSelector
          label="Available for"
          options={ENGAGEMENT_TYPES}
          selected={form.engagementTypes}
          onChange={(v) => setForm((f) => ({ ...f, engagementTypes: v }))}
        />

        {/* Availability type */}
        <TagSelector
          label="Travel availability"
          options={AVAILABILITY_TYPES}
          selected={form.availabilityType}
          onChange={(v) => setForm((f) => ({ ...f, availabilityType: v }))}
        />

        {/* Rate */}
        <div className="px-5 py-4 space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Day rate range (NZD) <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <div className="flex gap-3 items-center">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
              <input type="number" value={form.rateMinNzd}
                onChange={(e) => setForm((f) => ({ ...f, rateMinNzd: e.target.value }))}
                min={0} placeholder="min"
                className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <span className="text-gray-400 text-sm">–</span>
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
              <input type="number" value={form.rateMaxNzd}
                onChange={(e) => setForm((f) => ({ ...f, rateMaxNzd: e.target.value }))}
                min={0} placeholder="max"
                className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
        </div>

        {/* Teaching video */}
        <div className="px-5 py-4 space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Teaching video URL <span className="font-normal text-gray-400">(YouTube or Vimeo)</span>
          </label>
          <input type="url" value={form.teachingVideoUrl}
            onChange={(e) => setForm((f) => ({ ...f, teachingVideoUrl: e.target.value }))}
            placeholder="https://youtube.com/watch?v=…"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>

        {/* Location */}
        <div className="px-5 py-4 space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            City / region <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <input value={form.locationCity}
            onChange={(e) => setForm((f) => ({ ...f, locationCity: e.target.value }))}
            placeholder="e.g. Auckland"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>

        {/* Website */}
        <div className="px-5 py-4 space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Website <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <input type="url" value={form.websiteUrl}
            onChange={(e) => setForm((f) => ({ ...f, websiteUrl: e.target.value }))}
            placeholder="https://yoursite.com"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>

        {/* Avatar */}
        <div className="px-5 py-4 space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Profile photo URL <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <input type="url" value={form.avatarUrl}
            onChange={(e) => setForm((f) => ({ ...f, avatarUrl: e.target.value }))}
            placeholder="https://…"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          {form.avatarUrl && (
            <Image src={form.avatarUrl} alt="Preview"
              className="mt-2 h-16 w-16 rounded-full object-cover border border-gray-200"
              width={64}
              height={64}
            />
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-green-600">Profile saved.</p>}

      <button disabled={pending} onClick={handleSave}
        className="w-full bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
        {pending ? "Saving…" : "Save profile"}
      </button>
    </div>
  );
}
