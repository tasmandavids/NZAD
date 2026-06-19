// ============================================================================
//  POST /api/messages — send a message
//  GET  /api/messages?with=<userId> — fetch thread between current user + peer
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation/uuid";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const peerId = req.nextUrl.searchParams.get("with");
  if (!peerId) return NextResponse.json({ error: "Missing ?with param" }, { status: 400 });
  if (!isUuid(peerId)) return NextResponse.json({ error: "Invalid peer id" }, { status: 400 });

  // Fetch the thread (bidirectional) ordered oldest-first
  const { data, error } = await supabase
    .from("messages")
    .select(
      `id, body, channel, sent_at, read_at,
       from_user_id, to_user_id,
       sender:profiles!messages_from_user_id_fkey(id, first_name, last_name, avatar_url),
       recipient:profiles!messages_to_user_id_fkey(id, first_name, last_name, avatar_url)`
    )
    .or(
      `and(from_user_id.eq.${user.id},to_user_id.eq.${peerId}),` +
      `and(from_user_id.eq.${peerId},to_user_id.eq.${user.id})`
    )
    .order("sent_at", { ascending: true })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Mark unread messages (sent to current user) as read
  const unreadIds = (data ?? [])
    .filter((m) => m.to_user_id === user.id && !m.read_at)
    .map((m) => m.id);
  if (unreadIds.length) {
    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .in("id", unreadIds);
  }

  return NextResponse.json({ messages: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { toUserId, message, channel = "internal" } = body as {
    toUserId: string;
    message: string;
    channel?: string;
  };

  if (!toUserId || !message?.trim()) {
    return NextResponse.json({ error: "Missing toUserId or message" }, { status: 400 });
  }
  if (!isUuid(toUserId)) {
    return NextResponse.json({ error: "Invalid toUserId" }, { status: 400 });
  }

  const trimmed = message.trim();
  if (trimmed.length > 4000) {
    return NextResponse.json({ error: "Message too long" }, { status: 400 });
  }

  const allowedChannels = ["internal", "email", "sms"] as const;
  if (!allowedChannels.includes(channel as (typeof allowedChannels)[number])) {
    return NextResponse.json({ error: "Invalid channel" }, { status: 400 });
  }

  // Resolve studio_id from profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("studio_id")
    .eq("id", user.id)
    .single();

  if (!profile?.studio_id) {
    return NextResponse.json({ error: "Profile not found" }, { status: 400 });
  }

  const { data: recipient } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", toUserId)
    .eq("studio_id", profile.studio_id)
    .maybeSingle();

  if (!recipient) {
    return NextResponse.json({ error: "Recipient not found" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      studio_id:    profile.studio_id,
      from_user_id: user.id,
      to_user_id:   toUserId,
      body:         trimmed,
      channel,
    })
    .select(
      `id, body, channel, sent_at, read_at,
       from_user_id, to_user_id,
       sender:profiles!messages_from_user_id_fkey(id, first_name, last_name, avatar_url),
       recipient:profiles!messages_to_user_id_fkey(id, first_name, last_name, avatar_url)`
    )
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ message: data }, { status: 201 });
}
