import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation/uuid";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { threadId } = await params;
  if (!isUuid(threadId)) {
    return NextResponse.json({ error: "Invalid thread id" }, { status: 400 });
  }

  const { data: thread } = await supabase
    .from("parent_email_threads")
    .select("*")
    .eq("id", threadId)
    .eq("parent_id", user.id)
    .single();

  if (!thread) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: messages } = await supabase
    .from("parent_email_messages")
    .select("*")
    .eq("parent_email_thread_id", threadId)
    .eq("parent_id", user.id)
    .order("sent_at", { ascending: true });

  return NextResponse.json({ thread, messages: messages ?? [] });
}
