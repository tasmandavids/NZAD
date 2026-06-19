"use client";

import Link from "next/link";
import { MessageThread } from "@/components/admin/messages/MessageThread";

export default function ParentMessagesTab({
  currentUserId,
  parentId,
  parentName,
}: {
  currentUserId: string;
  parentId: string;
  parentName: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Send an internal message to {parentName}. They will receive a notification.
        </p>
        <Link
          href={`/portal/admin/messages?with=${parentId}`}
          className="text-sm font-semibold text-ink underline"
        >
          Open in Messages hub
        </Link>
      </div>
      <div className="overflow-hidden rounded-2xl border border-[--hair] bg-base">
        <MessageThread
          currentUserId={currentUserId}
          peerId={parentId}
          contact={{ id: parentId, name: parentName, role: "parent" }}
          compact
        />
      </div>
    </div>
  );
}
