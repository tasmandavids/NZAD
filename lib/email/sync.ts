import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptCredentials, encryptCredentials } from "./crypto";
import { syncGmailInbox, sendGmailReply } from "./providers/gmail";
import { syncMicrosoftInbox, sendMicrosoftReply } from "./providers/microsoft";
import { syncImapInbox, sendImapReply } from "./providers/imap";
import type { EmailAccountRow, EmailCredentials, EmailProvider, SyncedMessage } from "./types";

function participantsFromMessages(msgs: SyncedMessage[]): string[] {
  const set = new Set<string>();
  for (const m of msgs) {
    if (m.fromAddress) set.add(m.fromAddress);
    m.toAddresses.forEach((a) => set.add(a));
    m.ccAddresses.forEach((a) => set.add(a));
  }
  return [...set];
}

async function pullMessages(
  account: EmailAccountRow,
  creds: EmailCredentials,
): Promise<{ messages: SyncedMessage[]; nextCursor: string | null; refreshedCreds?: EmailCredentials }> {
  switch (account.provider) {
    case "gmail":
      if (creds.kind !== "oauth") throw new Error("Gmail requires OAuth");
      return syncGmailInbox(creds, account.sync_cursor);
    case "microsoft":
      if (creds.kind !== "oauth") throw new Error("Microsoft requires OAuth");
      return syncMicrosoftInbox(creds, account.sync_cursor);
    case "icloud":
    case "mailru":
      if (creds.kind !== "imap") throw new Error("IMAP credentials required");
      return syncImapInbox(creds, account.sync_cursor);
    default:
      throw new Error(`Unsupported provider: ${account.provider}`);
  }
}

export async function syncEmailAccount(
  supabase: SupabaseClient,
  account: EmailAccountRow,
): Promise<{ synced: number; error: string | null }> {
  let creds = decryptCredentials(account.credentials_encrypted);

  try {
    const { messages, nextCursor, refreshedCreds } = await pullMessages(account, creds);
    if (refreshedCreds) creds = refreshedCreds;

    const byThread = new Map<string, SyncedMessage[]>();
    for (const msg of messages) {
      const list = byThread.get(msg.providerThreadId) ?? [];
      list.push(msg);
      byThread.set(msg.providerThreadId, list);
    }

    let synced = 0;

    for (const [providerThreadId, threadMsgs] of byThread) {
      threadMsgs.sort((a, b) => (a.sentAt ?? "").localeCompare(b.sentAt ?? ""));

      const latest = threadMsgs[threadMsgs.length - 1];
      const participants = participantsFromMessages(threadMsgs);

      const { data: threadRow, error: threadErr } = await supabase
        .from("email_threads")
        .upsert(
          {
            account_id: account.id,
            studio_id: account.studio_id,
            provider_thread_id: providerThreadId,
            subject: latest.subject,
            snippet: latest.snippet,
            participant_addresses: participants,
            message_count: threadMsgs.length,
            last_message_at: latest.sentAt,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "account_id,provider_thread_id" },
        )
        .select("id")
        .single();

      if (threadErr || !threadRow) continue;

      for (const msg of threadMsgs) {
        const { error: msgErr } = await supabase.from("email_messages").upsert(
          {
            thread_id: threadRow.id,
            account_id: account.id,
            studio_id: account.studio_id,
            provider_message_id: msg.providerMessageId,
            from_address: msg.fromAddress,
            from_name: msg.fromName,
            to_addresses: msg.toAddresses,
            cc_addresses: msg.ccAddresses,
            subject: msg.subject,
            body_text: msg.bodyText,
            body_html: msg.bodyHtml,
            sent_at: msg.sentAt,
            is_outbound: msg.isOutbound,
            in_reply_to: msg.inReplyTo,
          },
          { onConflict: "account_id,provider_message_id" },
        );
        if (!msgErr) synced += 1;
      }
    }

    await supabase
      .from("email_accounts")
      .update({
        credentials_encrypted: encryptCredentials(creds),
        sync_cursor: nextCursor,
        last_sync_at: new Date().toISOString(),
        sync_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", account.id);

    return { synced, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    await supabase
      .from("email_accounts")
      .update({
        sync_error: message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", account.id);
    return { synced: 0, error: message };
  }
}

export async function sendEmailReply(
  account: EmailAccountRow,
  supabase: SupabaseClient,
  input: {
    to: string[];
    subject: string;
    bodyText: string;
    threadId?: string;
    providerThreadId?: string;
    inReplyTo?: string;
    references?: string;
  },
): Promise<{ ok: true; providerMessageId: string } | { ok: false; error: string }> {
  let creds = decryptCredentials(account.credentials_encrypted);

  try {
    let providerMessageId: string;
    let refreshedCreds: EmailCredentials | undefined;

    if (account.provider === "gmail" && creds.kind === "oauth") {
      const result = await sendGmailReply(creds, {
        ...input,
        threadId: input.providerThreadId,
      });
      providerMessageId = result.providerMessageId;
      refreshedCreds = result.refreshedCreds;
    } else if (account.provider === "microsoft" && creds.kind === "oauth") {
      const result = await sendMicrosoftReply(creds, input);
      providerMessageId = result.providerMessageId;
      refreshedCreds = result.refreshedCreds;
    } else if ((account.provider === "icloud" || account.provider === "mailru") && creds.kind === "imap") {
      const result = await sendImapReply(creds, input);
      providerMessageId = result.providerMessageId;
    } else {
      return { ok: false, error: "Invalid credentials for provider" };
    }

    if (refreshedCreds) {
      await supabase
        .from("email_accounts")
        .update({
          credentials_encrypted: encryptCredentials(refreshedCreds),
          updated_at: new Date().toISOString(),
        })
        .eq("id", account.id);
    }

    return { ok: true, providerMessageId };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Send failed" };
  }
}

export async function syncStudioAccounts(
  supabase: SupabaseClient,
  studioId: string,
): Promise<{ accounts: number; synced: number; errors: string[] }> {
  const { data: accounts } = await supabase
    .from("email_accounts")
    .select("*")
    .eq("studio_id", studioId);

  let synced = 0;
  const errors: string[] = [];
  for (const account of accounts ?? []) {
    const result = await syncEmailAccount(supabase, account as EmailAccountRow);
    synced += result.synced;
    if (result.error) errors.push(`${account.email_address}: ${result.error}`);
  }
  return { accounts: accounts?.length ?? 0, synced, errors };
}

export type { EmailProvider };
