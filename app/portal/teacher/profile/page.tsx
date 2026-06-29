import { requirePortalSession } from "@/lib/portal/session";
import { InstructorProfileEditor } from "@/components/portal/teacher/InstructorProfileEditor";

export type InstructorProfileData = {
  fullName: string;
  headline: string | null;
  bio: string | null;
  disciplines: string[];
  locationCity: string | null;
  websiteUrl: string | null;
  avatarUrl: string | null;
  profilePublic: boolean;
  slug: string | null;
};

export default async function InstructorProfilePage() {
  const { supabase, userId } = await requirePortalSession();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, headline, bio, disciplines, location_city, website_url, avatar_url, profile_public, active_studio_id")
    .eq("id", userId)
    .single();

  // Get the studio slug for the public profile link
  let slug: string | null = null;
  if (profile?.active_studio_id) {
    const { data: studio } = await supabase
      .from("studios")
      .select("slug")
      .eq("id", profile.active_studio_id)
      .single();
    slug = studio?.slug ?? null;
  }

  const data: InstructorProfileData = {
    fullName:      profile?.full_name ?? "",
    headline:      profile?.headline ?? null,
    bio:           profile?.bio ?? null,
    disciplines:   (profile?.disciplines as string[] | null) ?? [],
    locationCity:  profile?.location_city ?? null,
    websiteUrl:    profile?.website_url ?? null,
    avatarUrl:     profile?.avatar_url ?? null,
    profilePublic: profile?.profile_public ?? false,
    slug,
  };

  return <InstructorProfileEditor profile={data} />;
}
