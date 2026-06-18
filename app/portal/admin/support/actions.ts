"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

async function getAdminStudio() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in.", supabase, studioId: null as string | null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("studio_id, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return { error: "Admin only.", supabase, studioId: null };
  if (!profile.studio_id) return { error: "No studio.", supabase, studioId: null };

  return { error: null, supabase, studioId: profile.studio_id, userId: user.id };
}

const CreateSchema = z.object({
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
});

export async function createOwnerSupportThread(input: unknown): Promise<ActionResult> {
  const ctx = await getAdminStudio();
  if (ctx.error || !ctx.studioId) return { ok: false, error: ctx.error ?? "Unauthorized" };

  const parsed = CreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { data: thread, error: threadErr } = await ctx.supabase
    .from("platform_support_threads")
    .insert({
      studio_id: ctx.studioId,
      subject: parsed.data.subject,
      created_by: ctx.userId,
    })
    .select("id")
    .single();

  if (threadErr || !thread) return { ok: false, error: threadErr?.message ?? "Failed" };

  const { error: msgErr } = await ctx.supabase.from("platform_support_messages").insert({
    thread_id: thread.id,
    body: parsed.data.body,
    sender_profile_id: ctx.userId,
  });

  if (msgErr) return { ok: false, error: msgErr.message };

  revalidatePath("/portal/admin/support");
  return { ok: true };
}

const ReplySchema = z.object({
  threadId: z.string().uuid(),
  body: z.string().min(1).max(5000),
});

export async function replyOwnerSupport(input: unknown): Promise<ActionResult> {
  const ctx = await getAdminStudio();
  if (ctx.error || !ctx.studioId) return { ok: false, error: ctx.error ?? "Unauthorized" };

  const parsed = ReplySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { error } = await ctx.supabase.from("platform_support_messages").insert({
    thread_id: parsed.data.threadId,
    body: parsed.data.body,
    sender_profile_id: ctx.userId,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/portal/admin/support");
  return { ok: true };
}
