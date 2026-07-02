import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { InquiryForm } from "@/components/network/InquiryForm";

export default async function InquirePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  // Resolve instructor
  const { data: studio } = await supabase
    .from("studios")
    .select("id, name, kind")
    .eq("slug", slug)
    .eq("kind", "instructor")
    .single();
  if (!studio) notFound();

  const { data: instructor } = await supabase
    .from("profiles")
    .select("id, full_name, headline, avatar_url, profile_public, engagement_types")
    .eq("active_studio_id", studio.id)
    .eq("profile_public", true)
    .single();
  if (!instructor) notFound();

  // Resolve sender's studio
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/instructor/${slug}/inquire`);

  const { data: senderProfile } = await supabase
    .from("profiles")
    .select("role, active_studio_id, studio_id")
    .eq("id", user.id)
    .single();

  if (senderProfile?.role !== "admin") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-sm text-center space-y-3">
          <p className="text-sm text-gray-600">Only studio admins can send inquiries to instructors.</p>
          <Link href={`/instructor/${slug}`} className="text-sm text-indigo-600 hover:underline">
            ← Back to profile
          </Link>
        </div>
      </div>
    );
  }

  const studioId = senderProfile.active_studio_id ?? senderProfile.studio_id;
  if (!studioId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <p className="text-sm text-gray-600">No studio found for your account.</p>
      </div>
    );
  }

  const engagementTypes = (instructor.engagement_types as string[] | null) ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto py-10 px-4 sm:px-6 space-y-6">
        {/* Mini instructor card */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4">
          {instructor.avatar_url ? (
            <Image
              src={instructor.avatar_url}
              alt={instructor.full_name ?? ""}
              className="h-12 w-12 rounded-full object-cover"
              width={48}
              height={48}
            />
          ) : (
            <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
              <span className="text-lg font-bold text-indigo-600">
                {(instructor.full_name ?? "?").charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-gray-900">{instructor.full_name}</p>
            {instructor.headline && (
              <p className="text-xs text-gray-500">{instructor.headline}</p>
            )}
          </div>
        </div>

        <InquiryForm
          instructorProfileId={instructor.id}
          studioId={studioId}
          instructorName={instructor.full_name ?? "this instructor"}
          engagementTypes={engagementTypes}
          backHref={`/instructor/${slug}`}
        />
      </div>
    </div>
  );
}
