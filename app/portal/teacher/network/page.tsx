import { requirePortalSession } from "@/lib/portal/session";
import Link from "next/link";

const STATUS_COLORS: Record<string, string> = {
  sent:      "bg-yellow-50 text-yellow-700 border-yellow-200",
  viewed:    "bg-blue-50 text-blue-700 border-blue-200",
  replied:   "bg-indigo-50 text-indigo-700 border-indigo-200",
  declined:  "bg-red-50 text-red-700 border-red-200",
  accepted:  "bg-green-50 text-green-700 border-green-200",
  withdrawn: "bg-gray-100 text-gray-500 border-gray-200",
};

export default async function TeacherNetworkPage() {
  const { supabase, userId } = await requirePortalSession();

  const { data: inquiries } = await supabase
    .from("network_inquiries")
    .select(
      `id, subject, status, engagement_type, proposed_dates, created_at,
       studio:studios!network_inquiries_studio_id_fkey ( name )`
    )
    .eq("instructor_id", userId)
    .order("updated_at", { ascending: false });

  const unread = (inquiries ?? []).filter((i) => i.status === "sent").length;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">
          Inquiries
          {unread > 0 && (
            <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 rounded-full px-2 py-0.5">
              {unread} new
            </span>
          )}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Studios interested in working with you</p>
      </div>

      {!inquiries?.length ? (
        <div className="text-center py-16 text-sm text-gray-400">
          No inquiries yet. Make sure your{" "}
          <Link href="/portal/teacher/profile" className="text-indigo-600 hover:underline">
            profile is published
          </Link>{" "}
          so studios can find you.
        </div>
      ) : (
        <div className="space-y-3">
          {inquiries.map((inq) => {
            const studio = inq.studio as unknown as { name: string } | null;
            const statusClass = STATUS_COLORS[inq.status] ?? STATUS_COLORS.sent;
            const isNew = inq.status === "sent";

            return (
              <Link
                key={inq.id}
                href={`/portal/teacher/network/${inq.id}`}
                className={`flex items-start gap-4 bg-white border rounded-xl p-4 hover:border-indigo-300 hover:shadow-sm transition-all ${
                  isNew ? "border-yellow-300" : "border-gray-200"
                }`}
              >
                <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-indigo-600">
                    {(studio?.name ?? "?").charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium truncate ${isNew ? "text-gray-900" : "text-gray-700"}`}>
                      {inq.subject}
                    </p>
                    <span className={`shrink-0 text-xs border rounded-full px-2 py-0.5 ${statusClass}`}>
                      {inq.status.charAt(0).toUpperCase() + inq.status.slice(1)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {studio?.name ?? "Unknown studio"}
                    {inq.engagement_type ? ` · ${inq.engagement_type}` : ""}
                    {inq.proposed_dates ? ` · ${inq.proposed_dates}` : ""}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(inq.created_at).toLocaleDateString("en-NZ", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
