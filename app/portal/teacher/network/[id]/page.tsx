import { requirePortalSession } from "@/lib/portal/session";
import { notFound } from "next/navigation";
import Link from "next/link";
import { InquiryThread } from "@/components/network/InquiryThread";
import { markViewed } from "./actions";

export default async function TeacherInquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, userId } = await requirePortalSession();

  const { data: inquiry } = await supabase
    .from("network_inquiries")
    .select(
      `id, subject, status, engagement_type, proposed_dates, location,
       proposed_rate_nzd, message, created_at,
       studio:studios!network_inquiries_studio_id_fkey ( name, id )`
    )
    .eq("id", id)
    .eq("instructor_id", userId)
    .single();

  if (!inquiry) notFound();

  // Mark viewed if new
  if (inquiry.status === "sent") {
    await markViewed(id);
  }

  const { data: messages } = await supabase
    .from("network_messages")
    .select("id, body, created_at, sender_id, sender:profiles!network_messages_sender_id_fkey ( full_name )")
    .eq("inquiry_id", id)
    .order("created_at", { ascending: true });

  const studio = inquiry.studio as unknown as { name: string; id: string } | null;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <Link href="/portal/teacher/network" className="text-xs text-gray-400 hover:text-gray-600">
        ← All inquiries
      </Link>

      {/* Inquiry summary */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-400">From</p>
            <p className="text-sm font-semibold text-gray-900">{studio?.name ?? "Unknown studio"}</p>
          </div>
          <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-3 py-1 capitalize">
            {inquiry.status}
          </span>
        </div>

        <div className="border-t border-gray-100 pt-3 space-y-1.5">
          <p className="text-sm font-medium text-gray-900">{inquiry.subject}</p>
          {inquiry.engagement_type && (
            <Detail label="Type" value={inquiry.engagement_type} />
          )}
          {inquiry.proposed_dates && (
            <Detail label="Dates" value={inquiry.proposed_dates} />
          )}
          {inquiry.location && (
            <Detail label="Location" value={inquiry.location} />
          )}
          {inquiry.proposed_rate_nzd && (
            <Detail label="Rate" value={`NZD $${inquiry.proposed_rate_nzd}/day`} />
          )}
        </div>

        <div className="border-t border-gray-100 pt-3">
          <p className="text-xs font-medium text-gray-500 mb-1">Message</p>
          <p className="text-sm text-gray-700 whitespace-pre-line">{inquiry.message}</p>
        </div>
      </div>

      {/* Thread + respond controls */}
      <InquiryThread
        inquiryId={id}
        messages={(messages ?? []).map((m) => ({
          id:        m.id,
          body:      m.body,
          createdAt: m.created_at,
          senderId:  m.sender_id,
          senderName: (m.sender as unknown as { full_name: string | null } | null)?.full_name ?? "Unknown",
        }))}
        currentUserId={userId}
        status={inquiry.status}
        isInstructor
      />
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-xs">
      <span className="text-gray-400 w-20 shrink-0">{label}</span>
      <span className="text-gray-700">{value}</span>
    </div>
  );
}
