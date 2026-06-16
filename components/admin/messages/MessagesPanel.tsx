"use client";

// ============================================================================
//  MessagesPanel — internal messaging UI
//  Left: contact list with last-message preview + unread badge
//  Right: full thread with input box
//  SSE stream auto-appends incoming messages without polling
// ============================================================================

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Contact {
  id: string;
  first_name: string | null;
  last_name:  string | null;
  role:       string;
  avatar_url: string | null;
}

interface Message {
  id:           string;
  from_user_id: string;
  to_user_id:   string;
  body:         string;
  channel:      string;
  sent_at:      string;
  read_at:      string | null;
}

interface RecentMessage extends Message {}

interface Props {
  currentUserId:  string;
  contacts:       Contact[];
  recentMessages: RecentMessage[];
}

function initials(c: Contact) {
  return [c.first_name?.[0], c.last_name?.[0]].filter(Boolean).join("").toUpperCase() || "?";
}

function displayName(c: Contact) {
  return [c.first_name, c.last_name].filter(Boolean).join(" ") || "Unknown";
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function MessagesPanel({ currentUserId, contacts, recentMessages }: Props) {
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [thread, setThread] = useState<Message[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [sending, setSending] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [lastMessages, setLastMessages] = useState<Record<string, RecentMessage>>({});
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  // ── Derive last message + unread counts from recentMessages ───────────────
  useEffect(() => {
    const last: Record<string, RecentMessage> = {};
    const unread: Record<string, number> = {};

    recentMessages.forEach((m) => {
      const peerId = m.from_user_id === currentUserId ? m.to_user_id : m.from_user_id;
      if (!last[peerId]) last[peerId] = m;
      if (m.to_user_id === currentUserId && !m.read_at) {
        unread[peerId] = (unread[peerId] ?? 0) + 1;
      }
    });

    setLastMessages(last);
    setUnreadCounts(unread);
  }, [recentMessages, currentUserId]);

  // ── Load thread when contact selected ─────────────────────────────────────
  const loadThread = useCallback(async (peerId: string) => {
    setLoadingThread(true);
    setThread([]);
    try {
      const res = await fetch(`/api/messages?with=${peerId}`);
      const data = await res.json();
      setThread(data.messages ?? []);
      // Clear unread for this contact
      setUnreadCounts((prev) => ({ ...prev, [peerId]: 0 }));
    } finally {
      setLoadingThread(false);
    }
  }, []);

  const selectContact = (id: string) => {
    setSelectedContactId(id);
    setDraftText("");
    loadThread(id);
  };

  // ── SSE subscription ───────────────────────────────────────────────────────
  useEffect(() => {
    const es = new EventSource("/api/messages/stream");

    es.addEventListener("message", (e) => {
      const newMsg: Message = JSON.parse(e.data);
      const peerId = newMsg.from_user_id === currentUserId
        ? newMsg.to_user_id
        : newMsg.from_user_id;

      // Update last-message preview
      setLastMessages((prev) => ({ ...prev, [peerId]: newMsg }));

      // If viewing this thread, append; else increment unread
      setSelectedContactId((current) => {
        if (current === peerId) {
          setThread((t) => [...t, newMsg]);
        } else {
          setUnreadCounts((u) => ({ ...u, [peerId]: (u[peerId] ?? 0) + 1 }));
        }
        return current;
      });
    });

    return () => es.close();
  }, [currentUserId]);

  // ── Scroll to bottom on thread change ─────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread]);

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!selectedContactId || !draftText.trim() || sending) return;
    const body = draftText.trim();
    setSending(true);
    setDraftText("");

    // Optimistic append
    const optimistic: Message = {
      id:           `opt-${Date.now()}`,
      from_user_id: currentUserId,
      to_user_id:   selectedContactId,
      body,
      channel:      "internal",
      sent_at:      new Date().toISOString(),
      read_at:      null,
    };
    setThread((t) => [...t, optimistic]);

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUserId: selectedContactId, message: body }),
      });
      const data = await res.json();

      if (data.message) {
        // Replace optimistic entry with real server row
        setThread((t) =>
          t.map((m) => (m.id === optimistic.id ? data.message : m))
        );
        setLastMessages((prev) => ({ ...prev, [selectedContactId]: data.message }));
      }
    } catch {
      // Revert optimistic on error
      setThread((t) => t.filter((m) => m.id !== optimistic.id));
      setDraftText(body);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const selectedContact = contacts.find((c) => c.id === selectedContactId);

  // ── Sort contacts: unread first, then by last-message time ────────────────
  const sortedContacts = [...contacts].sort((a, b) => {
    const ua = unreadCounts[a.id] ?? 0;
    const ub = unreadCounts[b.id] ?? 0;
    if (ub !== ua) return ub - ua;
    const ta = lastMessages[a.id]?.sent_at ?? "";
    const tb = lastMessages[b.id]?.sent_at ?? "";
    return tb.localeCompare(ta);
  });

  return (
    <div className="flex h-screen overflow-hidden bg-base">
      {/* ── Contact list ──────────────────────────────────────────────────── */}
      <aside className="flex w-72 shrink-0 flex-col border-r border-[--hair] bg-surface">
        <div className="border-b border-[--hair] px-5 py-4">
          <h1 className="text-lg font-black text-ink">Messages</h1>
          <p className="text-xs text-muted">{contacts.length} contacts</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {sortedContacts.map((c) => {
            const unread = unreadCounts[c.id] ?? 0;
            const last   = lastMessages[c.id];
            const isSelected = selectedContactId === c.id;

            return (
              <button
                key={c.id}
                onClick={() => selectContact(c.id)}
                className={`flex w-full items-start gap-3 border-b border-[--hair] px-4 py-3 text-left transition-colors ${
                  isSelected
                    ? "bg-brand/10"
                    : "hover:bg-surface/60"
                }`}
              >
                {/* Avatar */}
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
                  style={{ background: "var(--brand)" }}
                >
                  {initials(c)}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className={`truncate text-sm font-semibold ${isSelected ? "text-brand" : "text-ink"}`}>
                      {displayName(c)}
                    </span>
                    {last && (
                      <span className="shrink-0 text-[0.65rem] text-muted">
                        {formatDate(last.sent_at) === "Today"
                          ? formatTime(last.sent_at)
                          : formatDate(last.sent_at)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <p className="truncate text-xs text-muted">
                      {last
                        ? (last.from_user_id === currentUserId ? "You: " : "") + last.body
                        : <span className="capitalize text-muted/60">{c.role}</span>
                      }
                    </p>
                    {unread > 0 && (
                      <span className="ml-1 shrink-0 rounded-full bg-brand px-1.5 py-0.5 text-[0.6rem] font-bold text-white">
                        {unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* ── Thread view ───────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col">
        {selectedContact ? (
          <>
            {/* Thread header */}
            <div className="flex items-center gap-3 border-b border-[--hair] bg-surface px-6 py-4">
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
                style={{ background: "var(--brand)" }}
              >
                {initials(selectedContact)}
              </span>
              <div>
                <p className="font-semibold text-ink">{displayName(selectedContact)}</p>
                <p className="text-xs capitalize text-muted">{selectedContact.role}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
              {loadingThread ? (
                <div className="flex h-full items-center justify-center text-muted text-sm">
                  Loading…
                </div>
              ) : thread.length === 0 ? (
                <div className="flex h-full items-center justify-center text-center text-muted text-sm">
                  <div>
                    <p className="text-2xl mb-2">💬</p>
                    <p>No messages yet.</p>
                    <p className="text-xs mt-1">Say hello to {displayName(selectedContact)}!</p>
                  </div>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {thread.map((msg) => {
                    const isMine = msg.from_user_id === currentUserId;
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.18 }}
                        className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                            isMine
                              ? "rounded-br-sm bg-brand text-white"
                              : "rounded-bl-sm bg-surface text-ink"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                          <p className={`mt-1 text-[0.62rem] ${isMine ? "text-white/60" : "text-muted"}`}>
                            {formatTime(msg.sent_at)}
                            {isMine && msg.read_at && " · Read"}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t border-[--hair] bg-surface px-6 py-4">
              <div className="flex items-end gap-3">
                <textarea
                  ref={inputRef}
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Message… (Enter to send, Shift+Enter for new line)"
                  rows={1}
                  className="flex-1 resize-none rounded-xl border border-[--hair] bg-base px-4 py-2.5 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none"
                  style={{ maxHeight: "120px", overflowY: "auto" }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!draftText.trim() || sending}
                  className="shrink-0 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-40 hover:opacity-90"
                >
                  {sending ? "…" : "Send"}
                </button>
              </div>
              <p className="mt-1.5 text-[0.62rem] text-muted">Internal channel — not visible to students or parents</p>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-center text-muted">
            <div>
              <p className="text-5xl mb-4">✉️</p>
              <p className="text-lg font-semibold text-ink">Select a contact</p>
              <p className="text-sm mt-1">Choose someone from the list to start a conversation.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
