import type { OAuthCredentials, SyncedMessage } from "../types";

const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

type GoogleApiError = {
  error?: { message?: string; status?: string; code?: number };
  emailAddress?: string;
  email?: string;
  threads?: { id: string }[];
};

function formatGmailApiError(status: number, message: string | undefined, fallback: string): string {
  const msg = message ?? fallback;
  if (status === 403) {
    if (/insufficient|scope|permission/i.test(msg)) {
      return "Gmail permissions missing — disconnect this inbox and reconnect, then approve all Gmail permissions.";
    }
    if (/not been used|disabled|accessNotConfigured/i.test(msg)) {
      return "Gmail API is not enabled — enable it in Google Cloud Console, then reconnect.";
    }
  }
  return msg;
}

export async function assertGmailAccess(accessToken: string): Promise<void> {
  const info = (await fetch(
    `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`,
  ).then((r) => r.json())) as { scope?: string; error?: string };
  if (info.error) {
    throw new Error("Gmail token is invalid — disconnect and reconnect this inbox.");
  }
  const scopes = info.scope?.split(" ") ?? [];
  if (!scopes.some((s) => s.includes("gmail"))) {
    throw new Error(
      "Gmail permissions were not granted. Disconnect this inbox and reconnect, then approve all requested permissions.",
    );
  }
}

async function listGmailThreadIds(accessToken: string): Promise<string[]> {
  const headers = { Authorization: `Bearer ${accessToken}` };
  await assertGmailAccess(accessToken);

  const urls = [
    "https://gmail.googleapis.com/gmail/v1/users/me/threads?maxResults=40&labelIds=INBOX",
    "https://gmail.googleapis.com/gmail/v1/users/me/threads?maxResults=40",
  ];

  let lastError = "Failed to list Gmail threads";
  for (const url of urls) {
    const res = await fetch(url, { headers });
    const body = (await res.json()) as GoogleApiError;
    if (res.ok) return (body.threads ?? []).map((t) => t.id);
    lastError = formatGmailApiError(res.status, body.error?.message, lastError);
    if (res.status === 401 || res.status === 403) break;
  }
  throw new Error(lastError);
}

async function fetchGoogleAccountEmail(accessToken: string): Promise<string> {
  const profileRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const profile = (await profileRes.json()) as GoogleApiError;
  if (profileRes.ok && profile.emailAddress) {
    return profile.emailAddress;
  }

  const userinfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const userinfo = (await userinfoRes.json()) as GoogleApiError;
  if (userinfoRes.ok && userinfo.email) {
    return userinfo.email;
  }

  const gmailMsg = profile.error?.message ?? (profileRes.status === 403
    ? "Gmail API access denied — enable the Gmail API in Google Cloud Console and reconnect."
    : `Gmail profile HTTP ${profileRes.status}`);
  const userinfoMsg = userinfo.error?.message;
  throw new Error(
    userinfoMsg ? `${gmailMsg} (${userinfoMsg})` : gmailMsg,
  );
}

export function gmailClientConfig() {
  const clientId = process.env.GOOGLE_MAIL_CLIENT_ID ?? process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_MAIL_CLIENT_SECRET ?? process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_MAIL_CLIENT_ID and GOOGLE_MAIL_CLIENT_SECRET are required");
  }
  return { clientId, clientSecret, scopes: GMAIL_SCOPES };
}

export function gmailAuthUrl(redirectUri: string, state: string): string {
  const { clientId, scopes } = gmailClientConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeGmailCode(
  code: string,
  redirectUri: string,
): Promise<OAuthCredentials & { email: string; displayName: string | null }> {
  const { clientId, clientSecret } = gmailClientConfig();
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
  };
  if (!tokenRes.ok || !tokenJson.access_token) {
    throw new Error(tokenJson.error ?? "Failed to exchange Google authorization code");
  }

  const email = await fetchGoogleAccountEmail(tokenJson.access_token);
  await assertGmailAccess(tokenJson.access_token);

  return {
    kind: "oauth",
    accessToken: tokenJson.access_token,
    refreshToken: tokenJson.refresh_token ?? null,
    expiresAt: tokenJson.expires_in ? Date.now() + tokenJson.expires_in * 1000 : null,
    email,
    displayName: null,
  };
}

export async function refreshGmailToken(creds: OAuthCredentials): Promise<OAuthCredentials> {
  if (!creds.refreshToken) return creds;
  if (creds.expiresAt && creds.expiresAt > Date.now() + 60_000) return creds;

  const { clientId, clientSecret } = gmailClientConfig();
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: creds.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const json = (await res.json()) as { access_token?: string; expires_in?: number; error?: string };
  if (!res.ok || !json.access_token) {
    throw new Error(json.error ?? "Failed to refresh Gmail token");
  }
  return {
    ...creds,
    accessToken: json.access_token,
    expiresAt: json.expires_in ? Date.now() + json.expires_in * 1000 : null,
  };
}

type GmailPart = {
  mimeType?: string;
  body?: { data?: string; size?: number };
  parts?: GmailPart[];
};

function decodeBase64Url(data: string): string {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf8");
}

function extractBodies(part: GmailPart | undefined): { text: string | null; html: string | null } {
  if (!part) return { text: null, html: null };
  let text: string | null = null;
  let html: string | null = null;

  const walk = (p: GmailPart) => {
    if (p.mimeType === "text/plain" && p.body?.data) text = decodeBase64Url(p.body.data);
    if (p.mimeType === "text/html" && p.body?.data) html = decodeBase64Url(p.body.data);
    p.parts?.forEach(walk);
  };
  walk(part);
  return { text, html };
}

function parseAddresses(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw.split(",").map((s) => {
    const match = s.match(/<([^>]+)>/);
    return (match?.[1] ?? s).trim().toLowerCase();
  }).filter(Boolean);
}

function parseFrom(raw: string | undefined): { address: string | null; name: string | null } {
  if (!raw) return { address: null, name: null };
  const match = raw.match(/^(?:"?([^"]*)"?\s)?<?([^>]+)>?$/);
  return {
    name: match?.[1]?.trim() || null,
    address: match?.[2]?.trim().toLowerCase() ?? null,
  };
}

function headerValue(headers: { name: string; value: string }[] | undefined, name: string): string | undefined {
  return headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value;
}

async function fetchGmailThreadMessages(
  threadIds: string[],
  accessToken: string,
): Promise<SyncedMessage[]> {
  const headers = { Authorization: `Bearer ${accessToken}` };
  const messages: SyncedMessage[] = [];
  const batchSize = 5;

  for (let i = 0; i < threadIds.length; i += batchSize) {
    const batch = threadIds.slice(i, i + batchSize);
    const batchMessages = await Promise.all(
      batch.map(async (id) => {
        const threadRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/threads/${id}?format=full`,
          { headers },
        );
        if (!threadRes.ok) return [] as SyncedMessage[];
        const thread = (await threadRes.json()) as {
          messages?: Parameters<typeof messageToSynced>[0][];
        };
        return (thread.messages ?? []).map(messageToSynced);
      }),
    );
    for (const threadMsgs of batchMessages) {
      messages.push(...threadMsgs);
    }
  }

  return messages;
}

function messageToSynced(
  msg: {
    id: string;
    threadId: string;
    snippet?: string;
    internalDate?: string;
    labelIds?: string[];
    payload?: GmailPart & { headers?: { name: string; value: string }[] };
  },
): SyncedMessage {
  const headers = msg.payload?.headers;
  const from = parseFrom(headerValue(headers, "From"));
  const { text, html } = extractBodies(msg.payload);
  const isOutbound = msg.labelIds?.includes("SENT") ?? false;

  return {
    providerMessageId: msg.id,
    providerThreadId: msg.threadId,
    fromAddress: from.address,
    fromName: from.name,
    toAddresses: parseAddresses(headerValue(headers, "To")),
    ccAddresses: parseAddresses(headerValue(headers, "Cc")),
    subject: headerValue(headers, "Subject") ?? null,
    bodyText: text,
    bodyHtml: html,
    sentAt: msg.internalDate ? new Date(Number(msg.internalDate)).toISOString() : null,
    isOutbound,
    inReplyTo: headerValue(headers, "In-Reply-To") ?? null,
    snippet: msg.snippet ?? text?.slice(0, 200) ?? null,
  };
}

export async function syncGmailInbox(
  creds: OAuthCredentials,
  syncCursor: string | null,
): Promise<{ messages: SyncedMessage[]; nextCursor: string | null; refreshedCreds: OAuthCredentials }> {
  const refreshedCreds = await refreshGmailToken(creds);
  const headers = { Authorization: `Bearer ${refreshedCreds.accessToken}` };

  let historyId = syncCursor;
  const messages: SyncedMessage[] = [];

  if (historyId) {
    const historyRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/history?startHistoryId=${historyId}&historyTypes=messageAdded`,
      { headers },
    );
    if (historyRes.ok) {
      const history = (await historyRes.json()) as {
        history?: { messagesAdded?: { message: { id: string; threadId: string } }[] }[];
        historyId?: string;
      };
      const ids = new Set<string>();
      for (const h of history.history ?? []) {
        for (const added of h.messagesAdded ?? []) {
          ids.add(added.message.id);
        }
      }
      for (const id of ids) {
        const msgRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
          { headers },
        );
        if (msgRes.ok) {
          messages.push(messageToSynced(await msgRes.json()));
        }
      }
      if (history.historyId) historyId = history.historyId;
    } else if (historyRes.status === 404) {
      historyId = null;
    }
  }

  if (!syncCursor || messages.length === 0) {
    const threadIds = await listGmailThreadIds(refreshedCreds.accessToken);
    messages.push(...(await fetchGmailThreadMessages(threadIds, refreshedCreds.accessToken)));

    const profileRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", { headers });
    const profile = (await profileRes.json()) as { historyId?: string };
    historyId = profile.historyId ?? historyId;
  }

  return { messages, nextCursor: historyId ?? syncCursor, refreshedCreds };
}

export async function sendGmailReply(
  creds: OAuthCredentials,
  input: {
    to: string[];
    subject: string;
    bodyText: string;
    threadId?: string;
    inReplyTo?: string;
    references?: string;
  },
): Promise<{ providerMessageId: string; refreshedCreds: OAuthCredentials }> {
  const refreshedCreds = await refreshGmailToken(creds);
  const toLine = input.to.join(", ");
  const headers = [
    `To: ${toLine}`,
    `Subject: ${input.subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
  ];
  if (input.inReplyTo) headers.push(`In-Reply-To: ${input.inReplyTo}`);
  if (input.references) headers.push(`References: ${input.references}`);

  const raw = Buffer.from(`${headers.join("\r\n")}\r\n\r\n${input.bodyText}`)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${refreshedCreds.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      raw,
      threadId: input.threadId,
    }),
  });
  const json = (await res.json()) as { id?: string; error?: { message?: string } };
  if (!res.ok || !json.id) {
    throw new Error(json.error?.message ?? "Failed to send Gmail message");
  }
  return { providerMessageId: json.id, refreshedCreds };
}
