"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformOperator } from "@/lib/platform/auth";
import { logPlatformAudit } from "@/lib/platform/audit";
import type { SupportMessage } from "@/lib/platform/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function loadThreadMessages(
  threadId: string,
): Promise<{ ok: true; messages: SupportMessage[] } | { ok: false; error: string }> {
  const auth = await requirePlatformOperator();
  if (!auth.ok) return auth;

  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .from("platform_support_messages")
    .select("id, body, sender_operator_id, sender_profile_id, created_at, profiles(full_name)")
    .eq("thread_id", threadId)
    .order("created_at");

  if (error) return { ok: false, error: error.message };

  const operatorIds = [
    ...new Set((rows ?? []).map((r) => r.sender_operator_id).filter(Boolean)),
  ] as string[];
  const { data: operators } = operatorIds.length
    ? await admin.from("platform_operators").select("user_id, full_name").in("user_id", operatorIds)
    : { data: [] };
  const opNames = new Map((operators ?? []).map((o) => [o.user_id, o.full_name]));

  const messages: SupportMessage[] = (rows ?? []).map((r) => {
    const profile = r.profiles as unknown as { full_name: string | null } | null;
    return {
      id: r.id,
      body: r.body,
      isOperator: !!r.sender_operator_id,
      senderName: r.sender_operator_id
        ? opNames.get(r.sender_operator_id) ?? "Olune"
        : profile?.full_name ?? "Owner",
      createdAt: r.created_at,
    };
  });

  return { ok: true, messages };
}

const ReplySchema = z.object({
  threadId: z.string().uuid(),
  body: z.string().min(1).max(5000),
});

export async function replyToThread(input: unknown): Promise<ActionResult> {
  const auth = await requirePlatformOperator();
  if (!auth.ok) return auth;

  const parsed = ReplySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const admin = createAdminClient();
  const { error: msgErr } = await admin.from("platform_support_messages").insert({
    thread_id: parsed.data.threadId,
    body: parsed.data.body,
    sender_operator_id: auth.userId,
  });

  if (msgErr) return { ok: false, error: msgErr.message };

  await admin
    .from("platform_support_threads")
    .update({ updated_at: new Date().toISOString(), status: "pending" })
    .eq("id", parsed.data.threadId);

  await logPlatformAudit({
    operatorId: auth.userId,
    action: "support.reply",
    targetType: "thread",
    targetId: parsed.data.threadId,
  });

  revalidatePath("/platform/messages");
  return { ok: true };
}

const StatusSchema = z.object({
  threadId: z.string().uuid(),
  status: z.enum(["open", "pending", "resolved"]),
});

export async function updateThreadStatus(input: unknown): Promise<ActionResult> {
  const auth = await requirePlatformOperator();
  if (!auth.ok) return auth;

  const parsed = StatusSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("platform_support_threads")
    .update({ status: parsed.data.status, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.threadId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/platform/messages");
  return { ok: true };
}
