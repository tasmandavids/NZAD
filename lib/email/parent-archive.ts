import type { SupabaseClient } from "@supabase/supabase-js";
import type { SyncedMessage } from "./types";

export type ParentProfile = {
  id: string;
  email: string;
};

export async function loadParentsByEmails(
  supabase: SupabaseClient,
  studioId: string,
  emails: string[],
): Promise<Map<string, ParentProfile>> {
  const normalized = [...new Set(emails.map((e) => e.toLowerCase().trim()).filter(Boolean))];
  if (!normalized.length) return new Map();

  const { data } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("studio_id", studioId)
    .eq("role", "parent")
    .in("email", normalized);

  const out = new Map<string, ParentProfile>();
  for (const row of data ?? []) {
    if (!row.email) continue;
    out.set(row.email.toLowerCase(), { id: row.id, email: row.email.toLowerCase() });
  }
  return out;
}

function parentEmailsInThread(
  participants: string[],
  accountEmail: string,
  parentsByEmail: Map<string, ParentProfile>,
): ParentProfile[] {
  const studioAddress = accountEmail.toLowerCase();
  const matched = new Map<string, ParentProfile>();

  for (const address of participants) {
    const key = address.toLowerCase();
    if (key === studioAddress) continue;
    const parent = parentsByEmail.get(key);
    if (parent) matched.set(parent.id, parent);
  }

  return [...matched.values()];
}

export async function archiveThreadForParents(
  supabase: SupabaseClient,
  input: {
    studioId: string;
    accountEmail: string;
    sourceThreadId: string;
    participants: string[];
    subject: string | null;
    snippet: string | null;
    lastMessageAt: string | null;
    messageCount: number;
    messages: Array<{
      sourceMessageId: string;
      synced: SyncedMessage;
    }>;
    parentsByEmail: Map<string, ParentProfile>;
  },
): Promise<number> {
  const parents = parentEmailsInThread(
    input.participants,
    input.accountEmail,
    input.parentsByEmail,
  );
  if (!parents.length) return 0;

  let archived = 0;

  for (const parent of parents) {
    const { data: parentThread, error: threadErr } = await supabase
      .from("parent_email_threads")
      .upsert(
        {
          studio_id: input.studioId,
          parent_id: parent.id,
          source_email_thread_id: input.sourceThreadId,
          subject: input.subject,
          snippet: input.snippet,
          participant_addresses: input.participants,
          message_count: input.messageCount,
          last_message_at: input.lastMessageAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "parent_id,source_email_thread_id" },
      )
      .select("id")
      .single();

    if (threadErr || !parentThread) continue;

    for (const msg of input.messages) {
      const { error: msgErr } = await supabase.from("parent_email_messages").upsert(
        {
          studio_id: input.studioId,
          parent_id: parent.id,
          parent_email_thread_id: parentThread.id,
          source_email_message_id: msg.sourceMessageId,
          from_address: msg.synced.fromAddress,
          from_name: msg.synced.fromName,
          to_addresses: msg.synced.toAddresses,
          subject: msg.synced.subject,
          body_text: msg.synced.bodyText,
          body_html: msg.synced.bodyHtml,
          sent_at: msg.synced.sentAt,
          is_outbound: msg.synced.isOutbound,
        },
        { onConflict: "parent_id,source_email_message_id" },
      );
      if (!msgErr) archived += 1;
    }
  }

  return archived;
}
