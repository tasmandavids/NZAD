"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import type { EmailAccountRow, EmailMessageRow, EmailThreadRow } from "@/lib/email/types";
import { PROVIDER_META } from "@/lib/email/types";
import {
  connectImapAccount,
  disconnectEmailAccount,
  markThreadReadAction,
  summarizeThreadAction,
  syncEmailAccountAction,
} from "@/app/portal/admin/email/actions";
import { oauthConnectPath } from "@/lib/email/oauth-paths";

type Account = Pick<
  EmailAccountRow,
  "id" | "provider" | "email_address" | "display_name" | "last_sync_at" | "sync_error"
>;

type Thread = EmailThreadRow;

function formatWhen(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function providerLabel(provider: Account["provider"]) {
  return PROVIDER_META[provider].label;
}

function EmailBody({ message }: { message: EmailMessageRow }) {
  if (message.body_html) {
    return (
      <iframe
        title="Email content"
        sandbox=""
        srcDoc={message.body_html}
        className="min-h-[240px] w-full rounded-xl border border-[--hair] bg-white"
      />
    );
  }
  return (
    <pre className="whitespace-pre-wrap rounded-xl border border-[--hair] bg-base p-4 text-sm text-ink">
      {message.body_text ?? "(No content)"}
    </pre>
  );
}

function ConnectPanel({ onConnected }: { onConnected: () => void }) {
  const [imapProvider, setImapProvider] = useState<"icloud" | "mailru" | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submitImap = () => {
    if (!imapProvider) return;
    setError(null);
    startTransition(async () => {
      const result = await connectImapAccount({ provider: imapProvider, email, password });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPassword("");
      setImapProvider(null);
      onConnected();
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-black text-ink">Email</h1>
        <p className="text-sm text-muted">
          Connect your real inbox — Gmail, Microsoft, iCloud, or Mail.ru. Messages sync exactly as they appear in your mail app.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {(["gmail", "microsoft"] as const).map((provider) => (
          <Link
            key={provider}
            href={oauthConnectPath(provider)}
            className="rounded-2xl border border-[--hair] bg-surface p-5 text-left transition hover:border-brand/40"
          >
            <p className="font-semibold text-ink">{PROVIDER_META[provider].label}</p>
            <p className="mt-1 text-xs text-muted">{PROVIDER_META[provider].description}</p>
            <p className="mt-3 text-xs font-semibold text-brand">Connect with OAuth →</p>
          </Link>
        ))}
        {(["icloud", "mailru"] as const).map((provider) => (
          <button
            key={provider}
            type="button"
            onClick={() => setImapProvider(provider)}
            className="rounded-2xl border border-[--hair] bg-surface p-5 text-left transition hover:border-brand/40"
          >
            <p className="font-semibold text-ink">{PROVIDER_META[provider].label}</p>
            <p className="mt-1 text-xs text-muted">{PROVIDER_META[provider].description}</p>
            <p className="mt-3 text-xs font-semibold text-brand">Connect with password →</p>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {imapProvider && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="rounded-2xl border border-[--hair] bg-surface p-5"
          >
            <h2 className="mb-4 font-black text-ink">Connect {PROVIDER_META[imapProvider].label}</h2>
            <div className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full rounded-xl border border-[--hair] bg-base px-4 py-2.5 text-sm"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={imapProvider === "icloud" ? "App-specific password" : "Password"}
                className="w-full rounded-xl border border-[--hair] bg-base px-4 py-2.5 text-sm"
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={submitImap}
                  disabled={pending || !email || !password}
                  className="rounded-xl px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                  style={{ background: "var(--brand)" }}
                >
                  {pending ? "Connecting…" : "Connect"}
                </button>
                <button type="button" onClick={() => setImapProvider(null)} className="text-sm text-muted">
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function EmailInbox({
  accounts: initialAccounts,
  threads: initialThreads,
  bannerError,
  bannerConnected,
}: {
  accounts: Account[];
  threads: Thread[];
  bannerError?: string | null;
  bannerConnected?: string | null;
}) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [threads, setThreads] = useState(initialThreads);
  const [selectedAccountId, setSelectedAccountId] = useState<string | "all">("all");
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<EmailMessageRow[]>([]);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [pending, startTransition] = useTransition();
  const [showConnect, setShowConnect] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    setAccounts(initialAccounts);
    setThreads(initialThreads);
  }, [initialAccounts, initialThreads]);

  const filteredThreads = useMemo(() => {
    return threads
      .filter((t) => selectedAccountId === "all" || t.account_id === selectedAccountId)
      .filter((t) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          (t.subject ?? "").toLowerCase().includes(q) ||
          (t.snippet ?? "").toLowerCase().includes(q) ||
          t.participant_addresses.some((p) => p.includes(q))
        );
      });
  }, [threads, selectedAccountId, search]);

  const loadThread = useCallback(async (threadId: string) => {
    setLoadingThread(true);
    try {
      const res = await fetch(`/api/email/threads/${threadId}`);
      const data = await res.json();
      setActiveThread(data.thread ?? null);
      setMessages(data.messages ?? []);
      await markThreadReadAction(threadId);
      setThreads((prev) => prev.map((t) => (t.id === threadId ? { ...t, is_read: true } : t)));
    } finally {
      setLoadingThread(false);
    }
  }, []);

  const selectThread = (threadId: string) => {
    setSelectedThreadId(threadId);
    setDraft("");
    loadThread(threadId);
  };

  const refresh = () => {
    setSyncError(null);
    startTransition(async () => {
      const accountId = selectedAccountId === "all" ? undefined : selectedAccountId;
      const result = await syncEmailAccountAction(accountId);
      if (!result.ok) {
        setSyncError(result.error);
        return;
      }
      window.location.reload();
    });
  };

  const summarize = () => {
    if (!selectedThreadId) return;
    startTransition(async () => {
      const result = await summarizeThreadAction(selectedThreadId);
      if (result.ok && result.data?.summary) {
        setActiveThread((prev) => (prev ? { ...prev, summary: result.data!.summary } : prev));
        setThreads((prev) =>
          prev.map((t) => (t.id === selectedThreadId ? { ...t, summary: result.data!.summary } : t)),
        );
      }
    });
  };

  const sendReply = async () => {
    if (!selectedThreadId || !activeThread || !draft.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: activeThread.account_id,
          threadId: selectedThreadId,
          bodyText: draft.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Send failed");
      setDraft("");
      await loadThread(selectedThreadId);
      refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const disconnect = (accountId: string) => {
    if (!confirm("Disconnect this email account?")) return;
    startTransition(async () => {
      await disconnectEmailAccount(accountId);
      window.location.reload();
    });
  };

  if (accounts.length === 0) {
    return (
      <>
        {bannerError && (
          <div className="border-b border-red-200 bg-red-50 px-6 py-3 text-sm text-red-700">{bannerError}</div>
        )}
        <ConnectPanel onConnected={() => window.location.reload()} />
      </>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {(bannerError || bannerConnected || syncError) && (
        <div
          className={`border-b px-6 py-3 text-sm ${
            bannerError || syncError
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-green-200 bg-green-50 text-green-800"
          }`}
        >
          {bannerError ?? syncError ?? `Connected ${bannerConnected} successfully. Syncing your inbox…`}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[--hair] px-5 py-3">
        <div>
          <h1 className="text-lg font-black text-ink">Email</h1>
          <p className="text-xs text-muted">Real mail from your connected accounts</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="rounded-lg border border-[--hair] bg-surface px-3 py-2 text-sm"
          >
            <option value="all">All inboxes</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.email_address} ({providerLabel(a.provider)})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={refresh}
            disabled={pending}
            className="rounded-lg border border-[--hair] px-3 py-2 text-sm font-medium text-ink hover:bg-base"
          >
            {pending ? "Syncing…" : "Sync now"}
          </button>
          <button
            type="button"
            onClick={() => setShowConnect(true)}
            className="rounded-lg border border-[--hair] px-3 py-2 text-sm text-muted hover:text-ink"
          >
            + Connect
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Thread list */}
        <aside className="flex w-full max-w-sm flex-col border-r border-[--hair] bg-surface/50">
          <div className="border-b border-[--hair] p-3">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations…"
              className="w-full rounded-xl border border-[--hair] bg-base px-3 py-2 text-sm"
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredThreads.length === 0 ? (
              <p className="p-4 text-sm text-muted">No conversations yet. Try syncing your inbox.</p>
            ) : (
              filteredThreads.map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => selectThread(thread.id)}
                  className={`w-full border-b border-[--hair]/60 px-4 py-3 text-left transition ${
                    selectedThreadId === thread.id ? "bg-brand/10" : "hover:bg-base"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={`truncate text-sm ${thread.is_read ? "font-medium text-ink" : "font-bold text-ink"}`}>
                      {thread.subject ?? "(no subject)"}
                    </p>
                    <span className="shrink-0 text-[0.62rem] text-muted">{formatWhen(thread.last_message_at)}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted">{thread.snippet ?? thread.participant_addresses.join(", ")}</p>
                  {thread.summary && (
                    <p className="mt-1 line-clamp-2 text-[0.62rem] text-brand">{thread.summary.split("\n")[0]}</p>
                  )}
                </button>
              ))
            )}
          </div>
          <div className="border-t border-[--hair] p-3 text-[0.62rem] text-muted">
            {accounts.map((a) => (
              <div key={a.id} className="py-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">{a.email_address}</span>
                  <button type="button" onClick={() => disconnect(a.id)} className="shrink-0 text-red-500 hover:underline">
                    Disconnect
                  </button>
                </div>
                {a.sync_error && (
                  <p className="mt-1 text-red-500">{a.sync_error}</p>
                )}
                {a.last_sync_at && !a.sync_error && (
                  <p className="mt-0.5 text-muted">Last sync {formatWhen(a.last_sync_at)}</p>
                )}
              </div>
            ))}
          </div>
        </aside>

        {/* Conversation */}
        <section className="flex min-w-0 flex-1 flex-col">
          {!selectedThreadId ? (
            <div className="grid flex-1 place-items-center text-sm text-muted">Select a conversation</div>
          ) : loadingThread && !messages.length ? (
            <div className="grid flex-1 place-items-center text-sm text-muted">Loading…</div>
          ) : (
            <>
              <div className="border-b border-[--hair] px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-black text-ink">{activeThread?.subject ?? "Conversation"}</h2>
                    <p className="text-xs text-muted">
                      {(activeThread?.participant_addresses ?? []).join(" · ")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={summarize}
                    disabled={pending}
                    className="rounded-lg border border-[--hair] px-3 py-1.5 text-xs font-semibold text-ink hover:bg-base"
                  >
                    {pending ? "Summarizing…" : "Summarize conversation"}
                  </button>
                </div>
                {activeThread?.summary && (
                  <div className="mt-3 rounded-xl border border-brand/20 bg-brand/5 p-3">
                    <p className="mb-1 text-[0.62rem] font-semibold uppercase tracking-widest text-brand">
                      Summary
                    </p>
                    <p className="whitespace-pre-wrap text-sm text-ink">{activeThread.summary}</p>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto p-5">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`rounded-2xl border p-4 ${
                      msg.is_outbound ? "border-brand/30 bg-brand/5" : "border-[--hair] bg-surface"
                    }`}
                  >
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                      <span className="font-semibold text-ink">
                        {msg.from_name ?? msg.from_address ?? "Unknown"}
                        {msg.is_outbound && " (you)"}
                      </span>
                      <span>{formatWhen(msg.sent_at)}</span>
                    </div>
                    {msg.subject && msg.subject !== activeThread?.subject && (
                      <p className="mb-2 text-xs font-medium text-muted">{msg.subject}</p>
                    )}
                    <EmailBody message={msg} />
                  </div>
                ))}
              </div>

              <div className="border-t border-[--hair] p-4">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Write a reply — sends from your connected email address…"
                  rows={3}
                  className="w-full resize-none rounded-xl border border-[--hair] bg-base px-4 py-3 text-sm"
                />
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={sendReply}
                    disabled={sending || !draft.trim()}
                    className="rounded-xl px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                    style={{ background: "var(--brand)" }}
                  >
                    {sending ? "Sending…" : "Send reply"}
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      <AnimatePresence>
        {showConnect && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-12 backdrop-blur-sm"
            onClick={() => setShowConnect(false)}
          >
            <motion.div
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 16, opacity: 0 }}
              className="w-full max-w-3xl rounded-2xl border border-[--hair] bg-base shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <ConnectPanel
                onConnected={() => {
                  setShowConnect(false);
                  window.location.reload();
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
