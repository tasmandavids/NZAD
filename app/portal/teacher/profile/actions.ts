"use server";

import { z } from "zod";
import { requirePortalSession } from "@/lib/portal/session";

// Accept any non-empty string for URL fields — the DB stores whatever the
// instructor entered; strict URL validation was causing false throws on
// existing values stored without a protocol prefix.
const urlField = z.string().max(500).optional();

const ProfileSchema = z.object({
  full_name:             z.string().min(1).max(120),
  headline:              z.string().max(160).optional(),
  bio:                   z.string().max(2000).optional(),
  disciplines:           z.array(z.string()).optional(),
  syllabus_certs:        z.array(z.string()).optional(),
  training_institutions: z.array(z.string()).optional(),
  age_groups:            z.array(z.string()).optional(),
  engagement_types:      z.array(z.string()).optional(),
  availability_type:     z.array(z.string()).optional(),
  teaching_video_url:    urlField,
  rate_min_nzd:          z.number().int().min(0).optional(),
  rate_max_nzd:          z.number().int().min(0).optional(),
  location_city:         z.string().max(80).optional(),
  website_url:           urlField,
  avatar_url:            urlField,
  profile_public:        z.boolean().optional(),
});

export async function updateInstructorProfile(data: unknown) {
  try {
    const { supabase, userId } = await requirePortalSession();

    const result = ProfileSchema.safeParse(data);
    if (!result.success) {
      return { error: result.error.issues[0]?.message ?? "Invalid profile data." };
    }
    const p = result.data;

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name:             p.full_name,
        headline:              p.headline ?? null,
        bio:                   p.bio ?? null,
        disciplines:           p.disciplines?.length ? p.disciplines : null,
        syllabus_certs:        p.syllabus_certs?.length ? p.syllabus_certs : null,
        training_institutions: p.training_institutions?.length ? p.training_institutions : null,
        age_groups:            p.age_groups?.length ? p.age_groups : null,
        engagement_types:      p.engagement_types?.length ? p.engagement_types : null,
        availability_type:     p.availability_type?.length ? p.availability_type : null,
        teaching_video_url:    p.teaching_video_url || null,
        rate_min_nzd:          p.rate_min_nzd ?? null,
        rate_max_nzd:          p.rate_max_nzd ?? null,
        location_city:         p.location_city ?? null,
        website_url:           p.website_url || null,
        avatar_url:            p.avatar_url || null,
        profile_public:        p.profile_public ?? false,
      })
      .eq("id", userId);

    if (error) return { error: error.message };
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unexpected error saving profile.";
    return { error: msg };
  }
}
