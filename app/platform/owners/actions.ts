"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformOperator } from "@/lib/platform/auth";
import { logPlatformAudit } from "@/lib/platform/audit";

export type ActionResult = { ok: true } | { ok: false; error: string };

const NotesSchema = z.object({
  studioId: z.string().uuid(),
  notes: z.string().max(10000),
  tags: z.array(z.string()).optional(),
});

export async function saveOwnerNotes(input: unknown): Promise<ActionResult> {
  const auth = await requirePlatformOperator();
  if (!auth.ok) return auth;

  const parsed = NotesSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("platform_owner_notes").upsert(
    {
      studio_id: parsed.data.studioId,
      notes: parsed.data.notes,
      tags: parsed.data.tags ?? [],
      updated_by: auth.userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "studio_id" },
  );

  if (error) return { ok: false, error: error.message };

  await logPlatformAudit({
    operatorId: auth.userId,
    action: "owner.notes_update",
    targetType: "studio",
    targetId: parsed.data.studioId,
  });

  revalidatePath("/platform/owners");
  return { ok: true };
}

const ThreadSchema = z.object({
  studioId: z.string().uuid(),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
});

export async function createSupportThread(input: unknown): Promise<ActionResult> {
  const auth = await requirePlatformOperator();
  if (!auth.ok) return auth;

  const parsed = ThreadSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const admin = createAdminClient();
  const { data: thread, error: threadErr } = await admin
    .from("platform_support_threads")
    .insert({
      studio_id: parsed.data.studioId,
      subject: parsed.data.subject,
      priority: parsed.data.priority,
      created_by: auth.userId,
      assigned_to: auth.userId,
    })
    .select("id")
    .single();

  if (threadErr || !thread) return { ok: false, error: threadErr?.message ?? "Failed to create thread" };

  const { error: msgErr } = await admin.from("platform_support_messages").insert({
    thread_id: thread.id,
    body: parsed.data.body,
    sender_operator_id: auth.userId,
  });

  if (msgErr) return { ok: false, error: msgErr.message };

  await logPlatformAudit({
    operatorId: auth.userId,
    action: "support.thread_create",
    targetType: "thread",
    targetId: thread.id,
    metadata: { studioId: parsed.data.studioId },
  });

  revalidatePath("/platform/messages");
  return { ok: true };
}
