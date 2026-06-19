"use client";

import { useCallback, useMemo, useState } from "react";
import { markParentEmailThreadRead } from "@/app/portal/parent/messages/actions";

export type ParentEmailThread = {
  id: string;
  subject: string | null;
  snippet: string | null;
  participant_addresses: string[];
  last_message_at: string | null;
  is_read: boolean;
};

export type ParentEmailMessage = {
  id: string;
  from_address: string | null;
  from_name: string | null;
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  sent_at: string | null;
  is_outbound: boolean;
};

function formatWhen(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatFullWhen(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MessageBody({ message }: { message: ParentEmailMessage }) {
  if (message.body_html) {
    const wrappedHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><base target="_blank"><style>
      body { margin: 0; padding: 24px; font-family: ui-sans-serif, system-ui, sans-serif; font-size: 15px; line-height: 1.65; color: #111; }
      img { max-width: 100%; height: auto; }
    </style></head><body>${message.body_html}</body></html>`;
    return (
      <iframe
        title="Email content"
        sandbox=""
        srcDoc={wrappedHtml}
        className="min-h-[24rem] w-full rounded-2xl border border-[--hair] bg-white shadow-sm"
      />
    );
  }
  return (
    <div className="min-h-[10rem] whitespace-pre-wrap rounded-2xl border border-[--hair] bg-base px-6 py-5 text-[15px] leading-relaxed text-ink">
      {message.body_text ?? "(No content)"}
    </div>
  );
}

export function ParentEmailInbox({
  threads: initialThreads,
  studioName,
}: {
  threads: ParentEmailThread[];
  studioName: string;
}) {
  const [threads, setThreads] = useState(initialThreads);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [activeThread, setActiveThread] = useState<ParentEmailThread | null>(null);
  const [messages, setMessages] = useState<ParentEmailMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return threads;
    const q = search.toLowerCase();
    return threads.filter(
      (t) =>
        (t.subject ?? "").toLowerCase().includes(q) ||
        (t.snippet ?? "").toLowerCase().includes(q),
    );
  }, [threads, search]);

  const loadThread = useCallback(async (threadId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/email/parent/threads/${threadId}`);
      const data = await res.json();
      if (!res.ok) return;
      setActiveThread(data.thread ?? null);
      setMessages(data.messages ?? []);
      await markParentEmailThreadRead(threadId);
      setThreads((prev) => prev.map((t) => (t.id === threadId ? { ...t, is_read: true } : t)));
    } finally {
      setLoading(false);
    }
  }, []);

  const openThread = (threadId: string) => {
    setSelectedThreadId(threadId);
    void loadThread(threadId);
  };

  return (
    <div className="flex h-[calc(100dvh-3.25rem)] min-h-[32rem] flex-col md:h-[calc(100dvh-3rem)]">
      <div className="border-b border-[--hair] px-6 py-5">
        <h1 className="text-2xl font-black text-ink">Studio email</h1>
        <p className="mt-1 text-sm text-muted">
          Email between you and {studioName}. Saved here for your records — separate from the studio admin inbox.
        </p>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="flex w-72 shrink-0 flex-col border-r border-[--hair] bg-surface/60 lg:w-80">
          <div className="border-b border-[--hair] p-4">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full rounded-xl border border-[--hair] bg-base px-4 py-2.5 text-sm"
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="p-5 text-sm leading-relaxed text-muted">
                No studio emails saved yet. When {studioName} emails you from their connected inbox, copies appear here.
              </p>
            ) : (
              filtered.map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => openThread(thread.id)}
                  className={`w-full border-b border-[--hair]/60 px-4 py-4 text-left transition ${
                    selectedThreadId === thread.id ? "bg-brand/10" : "hover:bg-base"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className={`truncate text-sm ${thread.is_read ? "font-medium text-ink" : "font-bold text-ink"}`}>
                      {thread.subject ?? "(no subject)"}
                    </p>
                    <span className="shrink-0 text-xs text-muted">{formatWhen(thread.last_message_at)}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">{thread.snippet ?? "—"}</p>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col bg-base/30">
          {!selectedThreadId ? (
            <div className="grid flex-1 place-items-center px-8 text-center text-sm text-muted">
              Select a conversation to read
            </div>
          ) : loading && !messages.length ? (
            <div className="grid flex-1 place-items-center text-sm text-muted">Loading…</div>
          ) : (
            <>
              <div className="shrink-0 border-b border-[--hair] bg-surface px-6 py-5 lg:px-8">
                <h2 className="text-2xl font-black tracking-tight text-ink">
                  {activeThread?.subject ?? "Conversation"}
                </h2>
                <p className="mt-2 text-sm text-muted">With {studioName}</p>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-6 lg:px-8">
                <div className="mx-auto flex max-w-4xl flex-col gap-8">
                  {messages.map((msg) => (
                    <article
                      key={msg.id}
                      className={`rounded-2xl border shadow-sm ${
                        msg.is_outbound
                          ? "border-[--hair] bg-surface"
                          : "border-brand/25 bg-brand/[0.04]"
                      }`}
                    >
                      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[--hair]/70 px-6 py-4">
                        <div>
                          <p className="text-base font-semibold text-ink">
                            {msg.is_outbound ? studioName : msg.from_name ?? msg.from_address ?? "You"}
                          </p>
                          {msg.from_address && !msg.is_outbound && (
                            <p className="text-sm text-muted">{msg.from_address}</p>
                          )}
                        </div>
                        <time className="text-sm text-muted">{formatFullWhen(msg.sent_at)}</time>
                      </header>
                      <div className="px-4 py-5 sm:px-6">
                        <MessageBody message={msg} />
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
