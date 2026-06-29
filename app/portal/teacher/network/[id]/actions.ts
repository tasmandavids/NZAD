"use server";

import { requirePortalSession } from "@/lib/portal/session";
import { revalidatePath } from "next/cache";

export async function sendMessage(inquiryId: string, body: string) {
  if (!body.trim()) return { error: "Message cannot be empty." };
  const { supabase, userId } = await requirePortalSession();

  const { error } = await supabase.from("network_messages").insert({
    inquiry_id: inquiryId,
    sender_id:  userId,
    body:       body.trim(),
  });

  if (error) return { error: error.message };
  revalidatePath(`/portal/teacher/network/${inquiryId}`);
  return { ok: true };
}

export async function respondToInquiry(inquiryId: string, status: "accepted" | "declined") {
  const { supabase, userId } = await requirePortalSession();

  const { error } = await supabase
    .from("network_inquiries")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", inquiryId)
    .eq("instructor_id", userId);

  if (error) return { error: error.message };
  revalidatePath(`/portal/teacher/network/${inquiryId}`);
  return { ok: true };
}

export async function markViewed(inquiryId: string) {
  const { supabase } = await requirePortalSession();
  await supabase.rpc("mark_inquiry_viewed", { p_inquiry_id: inquiryId });
}
