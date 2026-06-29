import { requirePortalSession } from "@/lib/portal/session";
import Link from "next/link";

const STATUS_LABELS: Record<string, string> = {
  sent:      "Sent",
  viewed:    "Viewed",
  replied:   "Replied",
  declined:  "Declined",
  accepted:  "Accepted",
  withdrawn: "Withdrawn",
};

const STATUS_COLORS: Record<string, string> = {
  sent:      "bg-yellow-50 text-yellow-700 border-yellow-200",
  viewed:    "bg-blue-50 text-blue-700 border-blue-200",
  replied:   "bg-indigo-50 text-indigo-700 border-indigo-200",
  declined:  "bg-red-50 text-red-700 border-red-200",
  accepted:  "bg-green-50 text-green-700 border-green-200",
  withdrawn: "bg-gray-100 text-gray-500 border-gray-200",
};

export default async function NetworkInquiriesPage() {
  const { supabase, studioId } = await requirePortalSession();

  const { data: inquiries } = await supabase
    .from("network_inquiries")
    .select(
      `id, subject, status, engagement_type, proposed_dates, created_at,
       instructor:profiles!network_inquiries_instructor_id_fkey ( full_name, headline, avatar_url )`
    )
    .eq("studio_id", studioId)
    .order("updated_at", { ascending: false });

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Network inquiries</h1>
          <p className="text-sm text-gray-500 mt-0.5">Instructor inquiries sent from your studio</p>
        </div>
        <Link
          href="/instructors"
          className="text-sm bg-indigo-600 text-white rounded-lg px-4 py-2 hover:bg-indigo-700"
        >
          Find instructors
        </Link>
      </div>

      {!inquiries?.length ? (
        <div className="text-center py-16 text-sm text-gray-400">
          No inquiries yet.{" "}
          <Link href="/instructors" className="text-indigo-600 hover:underline">
            Browse the instructor directory
          </Link>{" "}
          to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {inquiries.map((inq) => {
            const instructor = inq.instructor as unknown as {
              full_name: string | null;
              headline:  string | null;
              avatar_url: string | null;
            } | null;
            const statusClass = STATUS_COLORS[inq.status] ?? STATUS_COLORS.sent;

            return (
              <Link
                key={inq.id}
                href={`/portal/admin/network/inquiries/${inq.id}`}
                className="flex items-start gap-4 bg-white border border-gray-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-sm transition-all"
              >
                {instructor?.avatar_url ? (
                  <img
                    src={instructor.avatar_url}
                    alt={instructor.full_name ?? ""}
                    className="h-10 w-10 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-indigo-600">
                      {(instructor?.full_name ?? "?").charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">{inq.subject}</p>
                    <span className={`shrink-0 text-xs border rounded-full px-2 py-0.5 ${statusClass}`}>
                      {STATUS_LABELS[inq.status] ?? inq.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {instructor?.full_name ?? "Unknown instructor"}
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
