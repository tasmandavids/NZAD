// ============================================================================
//  POST /api/messages — send a message
//  GET  /api/messages?with=<userId> — fetch thread between current user + peer
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveEffectiveStudioId } from "@/lib/portal/access";
import {
  canMessagePeer,
  loadPeerProfile,
} from "@/lib/portal/message-recipients";
import { isMessageTopic, MESSAGE_TOPICS } from "@/lib/portal/message-topics";
import { isUuid } from "@/lib/validation/uuid";
import type { Role } from "@/lib/types";

function applyTopicFilter<T extends { eq: (col: string, val: string) => T; is: (col: string, val: null) => T; or: (filters: string) => T }>(
  query: T,
  topicParam: string | null,
): T {
  if (topicParam && isMessageTopic(topicParam)) {
    if (topicParam === "general") {
      return query.or("topic.eq.general,topic.is.null");
    }
    return query.eq("topic", topicParam);
  }
  return query.is("topic", null);
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const peerId = req.nextUrl.searchParams.get("with");
  const topicParam = req.nextUrl.searchParams.get("topic");
  if (!peerId) return NextResponse.json({ error: "Missing ?with param" }, { status: 400 });
  if (!isUuid(peerId)) return NextResponse.json({ error: "Invalid peer id" }, { status: 400 });
  if (topicParam && !isMessageTopic(topicParam)) {
    return NextResponse.json({ error: "Invalid topic" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("studio_id, active_studio_id, role")
    .eq("id", user.id)
    .single();

  const studioId = profile ? resolveEffectiveStudioId(profile) : null;
  if (!studioId) {
    return NextResponse.json({ error: "Profile not found" }, { status: 400 });
  }

  const peer = await loadPeerProfile(supabase, peerId, studioId);
  if (!peer) {
    return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
  }

  const allowed = await canMessagePeer(
    supabase,
    { id: user.id, role: profile!.role as Role, studioId },
    peer,
  );
  if (!allowed) {
    return NextResponse.json({ error: "Not allowed to message this contact" }, { status: 403 });
  }

  // Fetch the thread (bidirectional) ordered oldest-first
  let threadQuery = supabase
    .from("messages")
    .select("id, body, channel, topic, sent_at, read_at, from_user_id, to_user_id")
    .or(
      `and(from_user_id.eq.${user.id},to_user_id.eq.${peerId}),` +
      `and(from_user_id.eq.${peerId},to_user_id.eq.${user.id})`
    );

  threadQuery = applyTopicFilter(threadQuery, topicParam);

  const { data, error } = await threadQuery
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
  const { toUserId, message, channel = "internal", topic: topicInput } = body as {
    toUserId: string;
    message: string;
    channel?: string;
    topic?: string | null;
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

  let topic: string | null = null;
  if (topicInput != null && topicInput !== "") {
    if (!isMessageTopic(topicInput)) {
      return NextResponse.json({ error: "Invalid topic" }, { status: 400 });
    }
    topic = topicInput;
  }

  // Resolve studio_id from profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("studio_id, active_studio_id, role")
    .eq("id", user.id)
    .single();

  const studioId = profile ? resolveEffectiveStudioId(profile) : null;
  if (!studioId) {
    return NextResponse.json({ error: "Profile not found" }, { status: 400 });
  }

  const peer = await loadPeerProfile(supabase, toUserId, studioId);
  if (!peer) {
    return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
  }

  const allowed = await canMessagePeer(
    supabase,
    { id: user.id, role: profile!.role as Role, studioId },
    peer,
  );
  if (!allowed) {
    return NextResponse.json({ error: "Not allowed to message this contact" }, { status: 403 });
  }

  const senderRole = profile!.role as Role;
  const isParentAdminThread =
    (senderRole === "parent" && (peer.role === "admin" || peer.role === "office")) ||
    ((senderRole === "admin" || senderRole === "office") && peer.role === "parent");

  if (isParentAdminThread) {
    if (!topic) topic = MESSAGE_TOPICS[2];
  } else if (topic) {
    return NextResponse.json({ error: "Topic not allowed for this conversation" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      studio_id:    studioId,
      from_user_id: user.id,
      to_user_id:   toUserId,
      body:         trimmed,
      channel,
      topic,
    })
    .select("id, body, channel, topic, sent_at, read_at, from_user_id, to_user_id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ message: data }, { status: 201 });
}
