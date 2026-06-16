// ============================================================================
//  GET /api/messages/stream — Server-Sent Events for real-time new messages.
//  The client subscribes once and receives push events as they arrive.
//  Uses Supabase Realtime (postgres_changes) under the hood.
//
//  Protocol: each SSE event has type "message" with JSON payload = the new row.
// ============================================================================

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();

  // Create an SSE stream using a ReadableStream + Supabase Realtime channel
  const stream = new ReadableStream({
    start(controller) {
      const send = (eventName: string, data: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(
              `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`
            )
          );
        } catch {
          // Controller may be closed; ignore
        }
      };

      // Send heartbeat every 25s to keep the connection alive through proxies
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 25_000);

      // Subscribe to new messages addressed to the current user
      const channel = supabase
        .channel(`user-messages:${user.id}`)
        .on(
          "postgres_changes",
          {
            event:  "INSERT",
            schema: "public",
            table:  "messages",
            filter: `to_user_id=eq.${user.id}`,
          },
          (payload) => {
            send("message", payload.new);
          }
        )
        .subscribe();

      // Clean up when the client disconnects
      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        supabase.removeChannel(channel);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection:      "keep-alive",
      "X-Accel-Buffering": "no",   // disable nginx buffering
    },
  });
}
