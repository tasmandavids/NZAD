"use client";

import { useState, useTransition } from "react";
import type { SupportThread, SupportMessage } from "@/lib/platform/types";
import {
  replyToThread,
  updateThreadStatus,
  loadThreadMessages,
} from "@/app/platform/messages/actions";

export function SupportInbox({
  threads: initialThreads,
}: {
  threads: SupportThread[];
}) {
  const [threads, setThreads] = useState(initialThreads);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [reply, setReply] = useState("");
  const [pending, startTransition] = useTransition();

  function selectThread(id: string) {
    setSelectedId(id);
    startTransition(async () => {
      const res = await loadThreadMessages(id);
      if (res.ok) setMessages(res.messages);
    });
  }

  function sendReply() {
    if (!selectedId || !reply.trim()) return;
    startTransition(async () => {
      const res = await replyToThread({ threadId: selectedId, body: reply.trim() });
      if (res.ok) {
        setReply("");
        const msgs = await loadThreadMessages(selectedId);
        if (msgs.ok) setMessages(msgs.messages);
      }
    });
  }

  function setStatus(status: "open" | "pending" | "resolved") {
    if (!selectedId) return;
    startTransition(async () => {
      await updateThreadStatus({ threadId: selectedId, status });
      setThreads((prev) =>
        prev.map((t) => (t.id === selectedId ? { ...t, status } : t)),
      );
    });
  }

  const selected = threads.find((t) => t.id === selectedId);

  return (
    <div className="mx-auto flex h-[calc(100vh-53px)] max-w-6xl flex-col gap-0 p-6 md:h-screen md:flex-row md:p-6">
      <div className="mb-4 w-full shrink-0 md:mb-0 md:w-80 md:pr-4">
        <h1 className="mb-4 text-2xl font-black text-ink">Support inbox</h1>
        <ul className="max-h-96 space-y-2 overflow-y-auto md:max-h-[calc(100vh-8rem)]">
          {threads.map((t) => (
            <li key={t.id}>
              <button
                onClick={() => selectThread(t.id)}
                className={`w-full rounded-xl border p-3 text-left text-sm ${
                  selectedId === t.id ? "border-brand bg-surface" : "border-[--hair] bg-surface"
                }`}
              >
                <p className="font-semibold text-ink">{t.subject}</p>
                <p className="text-xs text-muted">
                  {t.studioName} · {t.status} · {t.priority}
                </p>
              </button>
            </li>
          ))}
          {threads.length === 0 && (
            <li className="text-sm text-muted">No support threads yet.</li>
          )}
        </ul>
      </div>

      <div className="flex flex-1 flex-col rounded-2xl border border-[--hair] bg-surface">
        {selected ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[--hair] p-4">
              <div>
                <h2 className="font-bold text-ink">{selected.subject}</h2>
                <p className="text-xs text-muted">{selected.studioName}</p>
              </div>
              <div className="flex gap-2">
                {(["open", "pending", "resolved"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    disabled={pending}
                    className={`rounded-full px-3 py-1 text-[0.65rem] uppercase tracking-wide ${
                      selected.status === s ? "bg-brand text-white" : "border border-[--hair]"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${
                    m.isOperator
                      ? "ml-auto bg-brand text-white"
                      : "mr-auto border border-[--hair] bg-base text-ink"
                  }`}
                >
                  <p className="mb-1 text-[0.65rem] opacity-70">
                    {m.senderName ?? (m.isOperator ? "Olune" : "Owner")}
                  </p>
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  <p className="mt-1 text-[0.6rem] opacity-60">
                    {new Date(m.createdAt).toLocaleString("en-NZ")}
                  </p>
                </div>
              ))}
            </div>

            <div className="border-t border-[--hair] p-4">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={2}
                placeholder="Reply to studio owner…"
                className="mb-2 w-full rounded-xl border border-[--hair] bg-base px-3 py-2 text-sm"
              />
              <button
                onClick={sendReply}
                disabled={pending || !reply.trim()}
                className="rounded-full bg-brand px-5 py-2 text-xs font-bold uppercase text-white disabled:opacity-50"
              >
                Send reply
              </button>
            </div>
          </>
        ) : (
          <div className="grid flex-1 place-items-center text-sm text-muted">
            Select a thread to view the conversation.
          </div>
        )}
      </div>
    </div>
  );
}
