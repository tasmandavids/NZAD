import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function PublicInstructorPage({ params }: { params: { slug: string } }) {
  const supabase = await createClient();

  // Find the studio by slug (instructor workspace), then get the profile
  const { data: studio } = await supabase
    .from("studios")
    .select("id, name, kind")
    .eq("slug", params.slug)
    .eq("kind", "instructor")
    .single();

  if (!studio) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, headline, bio, disciplines, location_city, website_url, avatar_url, profile_public")
    .eq("active_studio_id", studio.id)
    .eq("profile_public", true)
    .single();

  if (!profile) notFound();

  const disciplines = (profile.disciplines as string[] | null) ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="h-20 bg-gradient-to-r from-indigo-500 to-purple-600" />
          <div className="px-6 pb-6">
            <div className="-mt-10 flex items-end gap-4">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name ?? ""}
                  className="h-20 w-20 rounded-full border-4 border-white object-cover shadow-sm"
                />
              ) : (
                <div className="h-20 w-20 rounded-full border-4 border-white bg-indigo-100 flex items-center justify-center shadow-sm">
                  <span className="text-2xl font-bold text-indigo-600">
                    {(profile.full_name ?? "?").charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <div className="mt-3">
              <h1 className="text-xl font-bold text-gray-900">{profile.full_name}</h1>
              {profile.headline && (
                <p className="text-sm text-gray-500 mt-0.5">{profile.headline}</p>
              )}
              {profile.location_city && (
                <p className="text-xs text-gray-400 mt-1">📍 {profile.location_city}</p>
              )}
            </div>

            {disciplines.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {disciplines.map((d) => (
                  <span key={d} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
                    {d}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <div className="mt-4 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">About</h2>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{profile.bio}</p>
          </div>
        )}

        {/* Website */}
        {profile.website_url && (
          <div className="mt-4 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Links</h2>
            <a
              href={profile.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-indigo-600 hover:underline break-all"
            >
              {profile.website_url}
            </a>
          </div>
        )}

        <p className="mt-8 text-center text-xs text-gray-400">Powered by Olune</p>
      </div>
    </div>
  );
}
