"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { MessageThread, type ThreadMessage } from "@/components/admin/messages/MessageThread";

interface Contact {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  avatar_url: string | null;
}

interface Message {
  id: string;
  from_user_id: string;
  to_user_id: string;
  body: string;
  channel: string;
  sent_at: string;
  read_at: string | null;
}

interface RecentMessage extends Message {}

interface Props {
  currentUserId: string;
  contacts: Contact[];
  recentMessages: RecentMessage[];
  initialContactId?: string | null;
}

function initials(c: Contact) {
  return [c.first_name?.[0], c.last_name?.[0]].filter(Boolean).join("").toUpperCase() || "?";
}

function displayName(c: Contact, unknownLabel: string) {
  return [c.first_name, c.last_name].filter(Boolean).join(" ") || unknownLabel;
}

function formatTime(iso: string, locale: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

export function MessagesPanel({
  currentUserId,
  contacts,
  recentMessages,
  initialContactId = null,
}: Props) {
  const t = useTranslations("admin.messages");
  const tShared = useTranslations("admin.shared");
  const locale = useLocale();
  const [selectedContactId, setSelectedContactId] = useState<string | null>(
    initialContactId && contacts.some((c) => c.id === initialContactId)
      ? initialContactId
      : null,
  );
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [lastMessages, setLastMessages] = useState<Record<string, RecentMessage>>({});

  useEffect(() => {
    if (
      initialContactId &&
      contacts.some((c) => c.id === initialContactId) &&
      !selectedContactId
    ) {
      setSelectedContactId(initialContactId);
    }
  }, [initialContactId, contacts, selectedContactId]);

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

  useEffect(() => {
    const es = new EventSource("/api/messages/stream");

    es.addEventListener("message", (e) => {
      const newMsg: Message = JSON.parse(e.data);
      const peerId =
        newMsg.from_user_id === currentUserId ? newMsg.to_user_id : newMsg.from_user_id;

      setLastMessages((prev) => ({ ...prev, [peerId]: newMsg }));

      setSelectedContactId((current) => {
        if (current !== peerId) {
          setUnreadCounts((u) => ({ ...u, [peerId]: (u[peerId] ?? 0) + 1 }));
        } else {
          setUnreadCounts((prev) => ({ ...prev, [peerId]: 0 }));
        }
        return current;
      });
    });

    return () => es.close();
  }, [currentUserId]);

  const handleThreadMessage = (msg: ThreadMessage) => {
    if (!selectedContactId) return;
    setLastMessages((prev) => ({ ...prev, [selectedContactId]: msg }));
  };

  const selectContact = (id: string) => {
    setSelectedContactId(id);
    setUnreadCounts((prev) => ({ ...prev, [id]: 0 }));
  };

  const selectedContact = contacts.find((c) => c.id === selectedContactId);

  const sortedContacts = [...contacts].sort((a, b) => {
    const ua = unreadCounts[a.id] ?? 0;
    const ub = unreadCounts[b.id] ?? 0;
    if (ub !== ua) return ub - ua;
    const ta = lastMessages[a.id]?.sent_at ?? "";
    const tb = lastMessages[b.id]?.sent_at ?? "";
    return tb.localeCompare(ta);
  });

  function formatDate(iso: string) {
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return tShared("today");
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return tShared("yesterday");
    return d.toLocaleDateString(locale, { month: "short", day: "numeric" });
  }

  return (
    <div className="flex h-screen overflow-hidden bg-base">
      <aside className="flex w-72 shrink-0 flex-col border-r border-[--hair] bg-surface">
        <div className="border-b border-[--hair] px-5 py-4">
          <h1 className="text-lg font-black text-ink">{t("title")}</h1>
          <p className="text-xs text-muted">{t("contacts", { count: contacts.length })}</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {sortedContacts.map((c) => {
            const unread = unreadCounts[c.id] ?? 0;
            const last = lastMessages[c.id];
            const isSelected = selectedContactId === c.id;
            const name = displayName(c, tShared("unknown"));

            return (
              <button
                key={c.id}
                type="button"
                onClick={() => selectContact(c.id)}
                className={`flex w-full items-start gap-3 border-b border-[--hair] px-4 py-3 text-left transition-colors ${
                  isSelected ? "bg-brand/10" : "hover:bg-surface/60"
                }`}
              >
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
                  style={{ background: "var(--brand)" }}
                >
                  {initials(c)}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`truncate text-sm font-semibold ${isSelected ? "text-brand" : "text-ink"}`}
                    >
                      {name}
                    </span>
                    {last && (
                      <span className="shrink-0 text-[0.65rem] text-muted">
                        {formatDate(last.sent_at) === tShared("today")
                          ? formatTime(last.sent_at, locale)
                          : formatDate(last.sent_at)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <p className="truncate text-xs text-muted">
                      {last ? (
                        (last.from_user_id === currentUserId ? t("youPrefix") : "") + last.body
                      ) : (
                        <span className="capitalize text-muted/60">{c.role}</span>
                      )}
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

      <div className="flex flex-1 flex-col">
        {selectedContact && selectedContactId ? (
          <MessageThread
            currentUserId={currentUserId}
            peerId={selectedContactId}
            contact={{
              id: selectedContact.id,
              name: displayName(selectedContact, tShared("unknown")),
              role: selectedContact.role,
            }}
            onNewMessage={handleThreadMessage}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center text-center text-muted">
            <div>
              <p className="mb-4 text-5xl">✉️</p>
              <p className="text-lg font-semibold text-ink">{t("selectContact")}</p>
              <p className="mt-1 text-sm">{t("selectDescription")}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
