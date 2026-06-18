import { NextRequest, NextResponse } from "next/server";
import { getAdminEmailContext } from "@/lib/email/admin-context";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> },
) {
  const ctx = await getAdminEmailContext();
  if (ctx.error) {
    return NextResponse.json({ error: ctx.error }, { status: 401 });
  }

  const { threadId } = await params;

  const { data: thread } = await ctx.supabase
    .from("email_threads")
    .select("*")
    .eq("id", threadId)
    .eq("studio_id", ctx.studioId)
    .single();

  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: messages } = await ctx.supabase
    .from("email_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("sent_at", { ascending: true });

  return NextResponse.json({ thread, messages: messages ?? [] });
}
