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
} from "@/app/portal/admin/email/actions";
import { oauthConnectPath } from "@/lib/email/oauth-paths";
import type { ContactMatch } from "@/lib/email/identify-contact";
import { contactTypeLabel } from "@/lib/email/identify-contact";

async function runEmailSync(accountId?: string): Promise<{ ok: true; synced: number } | { ok: false; error: string }> {
  const res = await fetch("/api/email/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(accountId ? { accountId } : {}),
  });
  const data = (await res.json()) as { synced?: number; error?: string };
  if (!res.ok) return { ok: false, error: data.error ?? "Sync failed" };
  return { ok: true, synced: data.synced ?? 0 };
}

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

function contactBadgeClass(type: ContactMatch["type"]): string {
  switch (type) {
    case "parent":
      return "bg-sky-100 text-sky-800 border-sky-200";
    case "student":
      return "bg-violet-100 text-violet-800 border-violet-200";
    case "teacher":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "lead":
      return "bg-amber-100 text-amber-900 border-amber-200";
    default:
      return "bg-base text-muted border-[--hair]";
  }
}

function ContactBadge({ contact }: { contact: ContactMatch }) {
  const className = `inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${contactBadgeClass(contact.type)}`;
  const inner = (
    <>
      <span>{contact.label}</span>
      <span className="font-normal opacity-75">· {contactTypeLabel(contact.type)}</span>
    </>
  );
  if (contact.href) {
    return (
      <Link href={contact.href} className={`${className} transition hover:opacity-90`}>
        {inner}
      </Link>
    );
  }
  return <span className={className}>{inner}</span>;
}

function resolveContact(
  email: string | null | undefined,
  contacts: Record<string, ContactMatch>,
): ContactMatch | null {
  if (!email) return null;
  return contacts[email.toLowerCase()] ?? null;
}

function threadPrimaryLabel(
  thread: Thread,
  accountEmails: Set<string>,
  contacts: Record<string, ContactMatch>,
): string {
  const external = thread.participant_addresses?.find((p) => !accountEmails.has(p.toLowerCase()));
  const key = (external ?? thread.participant_addresses?.[0])?.toLowerCase();
  if (key && contacts[key]) return contacts[key].label;
  return external ?? thread.participant_addresses?.[0] ?? "Unknown sender";
}

function EmailBody({ message }: { message: EmailMessageRow }) {
  if (message.body_html) {
    const wrappedHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><base target="_blank"><style>
      body { margin: 0; padding: 24px; font-family: ui-sans-serif, system-ui, sans-serif; font-size: 15px; line-height: 1.65; color: #111; }
      img { max-width: 100%; height: auto; }
      a { color: #2563eb; }
    </style></head><body>${message.body_html}</body></html>`;
    return (
      <iframe
        title="Email content"
        sandbox=""
        srcDoc={wrappedHtml}
        className="min-h-[28rem] w-full rounded-2xl border border-[--hair] bg-white shadow-sm"
      />
    );
  }
  return (
    <div className="min-h-[12rem] whitespace-pre-wrap rounded-2xl border border-[--hair] bg-base px-6 py-5 text-[15px] leading-relaxed text-ink">
      {message.body_text ?? "(No content)"}
    </div>
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
  contacts: initialContacts,
  bannerError,
  bannerConnected,
}: {
  accounts: Account[];
  threads: Thread[];
  contacts: Record<string, ContactMatch>;
  bannerError?: string | null;
  bannerConnected?: string | null;
}) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [threads, setThreads] = useState(initialThreads);
  const [contacts, setContacts] = useState(initialContacts);
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
  const [initialSyncDone, setInitialSyncDone] = useState(!bannerConnected);

  useEffect(() => {
    if (!bannerConnected || initialSyncDone) return;

    let cancelled = false;
    void (async () => {
      const result = await runEmailSync();
      if (cancelled) return;
      if (!result.ok) setSyncError(result.error);
      window.history.replaceState(null, "", "/portal/admin/email");
      window.location.reload();
    })();

    return () => {
      cancelled = true;
    };
  }, [bannerConnected, initialSyncDone]);

  useEffect(() => {
    setAccounts(initialAccounts);
    setThreads(initialThreads);
    setContacts(initialContacts);
  }, [initialAccounts, initialThreads, initialContacts]);

  const accountEmails = useMemo(
    () => new Set(accounts.map((a) => a.email_address.toLowerCase())),
    [accounts],
  );

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
      if (!res.ok) {
        setSyncError(data.error ?? "Could not load conversation");
        return;
      }
      setActiveThread(data.thread ?? null);
      setMessages(data.messages ?? []);
      if (data.contacts) {
        setContacts((prev) => ({ ...prev, ...data.contacts }));
      }
      void markThreadReadAction(threadId).then(() => {
        setThreads((prev) => prev.map((t) => (t.id === threadId ? { ...t, is_read: true } : t)));
      });
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
      const result = await runEmailSync(accountId);
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
      {(bannerError || syncError || (bannerConnected && !initialSyncDone)) && (
        <div
          className={`border-b px-6 py-3 text-sm ${
            bannerError || syncError
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-green-200 bg-green-50 text-green-800"
          }`}
        >
          {bannerError ??
            syncError ??
            (bannerConnected && !initialSyncDone ? "Connected — syncing your inbox in the background…" : null)}
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

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Thread list */}
        <aside className="flex w-[17.5rem] shrink-0 flex-col border-r border-[--hair] bg-surface/60 lg:w-80">
          <div className="border-b border-[--hair] p-4">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations…"
              className="w-full rounded-xl border border-[--hair] bg-base px-4 py-2.5 text-sm"
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredThreads.length === 0 ? (
              <p className="p-5 text-sm leading-relaxed text-muted">No conversations yet. Try syncing your inbox.</p>
            ) : (
              filteredThreads.map((thread) => {
                const primary = threadPrimaryLabel(thread, accountEmails, contacts);
                const external = thread.participant_addresses?.find((p) => !accountEmails.has(p.toLowerCase()));
                const contact = resolveContact(external, contacts);

                return (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => selectThread(thread.id)}
                    className={`w-full border-b border-[--hair]/60 px-4 py-4 text-left transition ${
                      selectedThreadId === thread.id ? "bg-brand/10" : "hover:bg-base"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className={`truncate text-sm ${thread.is_read ? "font-medium text-ink" : "font-bold text-ink"}`}>
                        {primary}
                      </p>
                      <span className="shrink-0 text-xs text-muted">{formatWhen(thread.last_message_at)}</span>
                    </div>
                    <p className="mt-1 truncate text-sm font-medium text-ink/80">{thread.subject ?? "(no subject)"}</p>
                    {contact && (
                      <div className="mt-2">
                        <ContactBadge contact={contact} />
                      </div>
                    )}
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">
                      {thread.snippet ?? thread.participant_addresses.join(", ")}
                    </p>
                    {thread.summary && (
                      <p className="mt-2 line-clamp-2 text-xs text-brand">{thread.summary.split("\n")[0]}</p>
                    )}
                  </button>
                );
              })
            )}
          </div>
          <div className="border-t border-[--hair] p-4 text-xs text-muted">
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
        <section className="flex min-w-0 flex-1 flex-col bg-base/30">
          {!selectedThreadId ? (
            <div className="grid flex-1 place-items-center px-8 text-center">
              <div>
                <p className="text-lg font-semibold text-ink">Select a conversation</p>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
                  Choose a thread from the left to read and reply. Olune will identify parents, students, and leads when their email is in your studio.
                </p>
              </div>
            </div>
          ) : loadingThread && !messages.length ? (
            <div className="grid flex-1 place-items-center text-sm text-muted">Loading conversation…</div>
          ) : (
            <>
              <div className="shrink-0 border-b border-[--hair] bg-surface px-6 py-5 lg:px-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-3">
                    <h2 className="text-2xl font-black tracking-tight text-ink">
                      {activeThread?.subject ?? "Conversation"}
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {(activeThread?.participant_addresses ?? [])
                        .filter((p) => !accountEmails.has(p.toLowerCase()))
                        .map((email) => {
                          const contact = resolveContact(email, contacts);
                          if (contact) return <ContactBadge key={email} contact={contact} />;
                          return (
                            <span
                              key={email}
                              className="inline-flex rounded-full border border-[--hair] bg-base px-2.5 py-0.5 text-xs text-muted"
                            >
                              {email}
                            </span>
                          );
                        })}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={summarize}
                    disabled={pending}
                    className="rounded-xl border border-[--hair] bg-surface px-4 py-2 text-sm font-semibold text-ink transition hover:bg-base"
                  >
                    {pending ? "Summarizing…" : "Summarize"}
                  </button>
                </div>
                {activeThread?.summary && (
                  <div className="mt-5 rounded-2xl border border-brand/20 bg-brand/5 px-5 py-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-brand">Summary</p>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{activeThread.summary}</p>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-6 lg:px-8">
                <div className="mx-auto flex max-w-4xl flex-col gap-8">
                  {messages.map((msg) => {
                    const contact = resolveContact(msg.from_address, contacts);
                    return (
                      <article
                        key={msg.id}
                        className={`rounded-2xl border shadow-sm ${
                          msg.is_outbound
                            ? "border-brand/25 bg-brand/[0.04]"
                            : "border-[--hair] bg-surface"
                        }`}
                      >
                        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[--hair]/70 px-6 py-4">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-base font-semibold text-ink">
                                {contact?.label ?? msg.from_name ?? msg.from_address ?? "Unknown"}
                                {msg.is_outbound && (
                                  <span className="ml-2 text-sm font-normal text-muted">(you)</span>
                                )}
                              </p>
                              {contact && !msg.is_outbound && (
                                <div className="flex flex-wrap items-center gap-2">
                                  <ContactBadge contact={contact} />
                                  {contact.type === "parent" && (
                                    <span className="text-xs text-muted">Saved to parent portal</span>
                                  )}
                                </div>
                              )}
                            </div>
                            {msg.from_address && (
                              <p className="text-sm text-muted">{msg.from_address}</p>
                            )}
                          </div>
                          <time className="text-sm text-muted">{formatFullWhen(msg.sent_at)}</time>
                        </header>
                        <div className="px-4 py-5 sm:px-6">
                          {msg.subject && msg.subject !== activeThread?.subject && (
                            <p className="mb-4 text-sm font-medium text-muted">{msg.subject}</p>
                          )}
                          <EmailBody message={msg} />
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>

              <div className="shrink-0 border-t border-[--hair] bg-surface px-4 py-5 lg:px-8">
                <div className="mx-auto max-w-4xl space-y-3">
                  {(() => {
                    const replyTo = (activeThread?.participant_addresses ?? []).find(
                      (p) => !accountEmails.has(p.toLowerCase()),
                    );
                    const replyContact = resolveContact(replyTo, contacts);
                    return (
                      <p className="text-sm text-muted">
                        Reply from your connected inbox
                        {replyContact ? (
                          <>
                            {" "}
                            to <span className="font-medium text-ink">{replyContact.label}</span>
                          </>
                        ) : replyTo ? (
                          <>
                            {" "}
                            to <span className="font-medium text-ink">{replyTo}</span>
                          </>
                        ) : null}
                      </p>
                    );
                  })()}
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Write your reply…"
                    rows={6}
                    className="min-h-[10rem] w-full resize-y rounded-2xl border border-[--hair] bg-base px-5 py-4 text-base leading-relaxed text-ink outline-none ring-brand/30 transition focus:ring-2"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={sendReply}
                      disabled={sending || !draft.trim()}
                      className="rounded-xl px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                      style={{ background: "var(--brand)" }}
                    >
                      {sending ? "Sending…" : "Send reply"}
                    </button>
                  </div>
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
