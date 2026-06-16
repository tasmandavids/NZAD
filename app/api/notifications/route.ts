// ============================================================================
//  GET  /api/notifications       — fetch recent notifications for current user
//  POST /api/notifications/read  — mark notification(s) as read
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = Number(req.nextUrl.searchParams.get("limit") ?? "30");

  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, title, body, link, sent_at, read_at")
    .eq("user_id", user.id)
    .order("sent_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const unreadCount = (data ?? []).filter((n) => !n.read_at).length;

  return NextResponse.json({ notifications: data ?? [], unreadCount });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { ids } = body as { ids?: string[] };

  if (ids?.length) {
    // Mark specific notifications as read
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .in("id", ids)
      .eq("user_id", user.id);
  } else {
    // Mark all as read
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);
  }

  return NextResponse.json({ ok: true });
}
