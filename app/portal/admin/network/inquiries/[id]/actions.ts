"use server";

import { z } from "zod";
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
  revalidatePath(`/portal/admin/network/inquiries/${inquiryId}`);
  return { ok: true };
}

export async function withdrawInquiry(inquiryId: string) {
  const { supabase, studioId } = await requirePortalSession();

  const { error } = await supabase
    .from("network_inquiries")
    .update({ status: "withdrawn", updated_at: new Date().toISOString() })
    .eq("id", inquiryId)
    .eq("studio_id", studioId);

  if (error) return { error: error.message };
  revalidatePath(`/portal/admin/network/inquiries/${inquiryId}`);
  return { ok: true };
}
