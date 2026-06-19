"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("admin.parents.messages");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {t("description", { name: parentName })}
        </p>
        <Link
          href={`/portal/admin/messages?with=${parentId}`}
          className="text-sm font-semibold text-ink underline"
        >
          {t("openInHub")}
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
