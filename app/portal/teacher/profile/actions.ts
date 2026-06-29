"use server";

import { z } from "zod";
import { requirePortalSession } from "@/lib/portal/session";

const ProfileSchema = z.object({
  full_name:      z.string().min(1).max(120),
  headline:       z.string().max(160).optional(),
  bio:            z.string().max(2000).optional(),
  disciplines:    z.array(z.string()).optional(),
  location_city:  z.string().max(80).optional(),
  website_url:    z.string().url().optional().or(z.literal("")),
  avatar_url:     z.string().url().optional().or(z.literal("")),
  profile_public: z.boolean().optional(),
});

export async function updateInstructorProfile(data: z.infer<typeof ProfileSchema>) {
  const { supabase, userId } = await requirePortalSession();
  const p = ProfileSchema.parse(data);
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name:      p.full_name,
      headline:       p.headline ?? null,
      bio:            p.bio ?? null,
      disciplines:    p.disciplines?.length ? p.disciplines : null,
      location_city:  p.location_city ?? null,
      website_url:    p.website_url || null,
      avatar_url:     p.avatar_url || null,
      profile_public: p.profile_public ?? false,
    })
    .eq("id", userId);
  if (error) return { error: error.message };
  return { ok: true };
}
