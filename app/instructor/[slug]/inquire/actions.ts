"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const InquirySchema = z.object({
  instructorProfileId: z.string().uuid(),
  studioId:            z.string().uuid(),
  subject:             z.string().min(1).max(200),
  engagementType:      z.string().max(80).optional(),
  proposedDates:       z.string().max(200).optional(),
  location:            z.string().max(200).optional(),
  proposedRateNzd:     z.coerce.number().int().positive().optional(),
  message:             z.string().min(10).max(3000),
});

export type InquiryResult = { error: string } | { ok: true; inquiryId: string };

export async function sendInquiry(formData: FormData): Promise<InquiryResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in to send an inquiry." };

  const raw = Object.fromEntries(formData.entries());
  const parsed = InquirySchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid form data" };
  }
  const d = parsed.data;

  // Verify the sender is an admin of the given studio
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, studio_id, active_studio_id")
    .eq("id", user.id)
    .single();

  const effectiveStudio = profile?.active_studio_id ?? profile?.studio_id;
  if (!effectiveStudio || effectiveStudio !== d.studioId) {
    return { error: "Studio mismatch — please refresh and try again." };
  }
  if (profile?.role !== "admin") {
    return { error: "Only studio admins can send inquiries." };
  }

  const { data: inquiry, error } = await supabase
    .from("network_inquiries")
    .insert({
      instructor_id:     d.instructorProfileId,
      studio_id:         d.studioId,
      sender_id:         user.id,
      subject:           d.subject,
      engagement_type:   d.engagementType ?? null,
      proposed_dates:    d.proposedDates ?? null,
      location:          d.location ?? null,
      proposed_rate_nzd: d.proposedRateNzd ?? null,
      message:           d.message,
    })
    .select("id")
    .single();

  if (error || !inquiry) return { error: error?.message ?? "Failed to send inquiry." };

  redirect(`/portal/admin/network/inquiries/${inquiry.id}?sent=1`);
}
