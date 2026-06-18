import type { OAuthCredentials, SyncedMessage } from "../types";

const MS_SCOPES = ["offline_access", "User.Read", "Mail.Read", "Mail.ReadWrite", "Mail.Send"].join(" ");

export function microsoftClientConfig() {
  const clientId = process.env.MICROSOFT_MAIL_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_MAIL_CLIENT_SECRET;
  const tenant = process.env.MICROSOFT_MAIL_TENANT ?? "common";
  if (!clientId || !clientSecret) {
    throw new Error("MICROSOFT_MAIL_CLIENT_ID and MICROSOFT_MAIL_CLIENT_SECRET are required");
  }
  return { clientId, clientSecret, tenant, scopes: MS_SCOPES };
}

export function microsoftAuthUrl(redirectUri: string, state: string): string {
  const { clientId, tenant, scopes } = microsoftClientConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes,
    state,
    response_mode: "query",
  });
  return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params}`;
}

export async function exchangeMicrosoftCode(
  code: string,
  redirectUri: string,
): Promise<OAuthCredentials & { email: string; displayName: string | null }> {
  const { clientId, clientSecret, tenant } = microsoftClientConfig();
  const tokenRes = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error_description?: string;
  };
  if (!tokenRes.ok || !tokenJson.access_token) {
    throw new Error(tokenJson.error_description ?? "Failed to exchange Microsoft authorization code");
  }

  const meRes = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });
  const me = (await meRes.json()) as { mail?: string; userPrincipalName?: string; displayName?: string };
  const email = me.mail ?? me.userPrincipalName;
  if (!meRes.ok || !email) throw new Error("Failed to read Microsoft profile");

  return {
    kind: "oauth",
    accessToken: tokenJson.access_token,
    refreshToken: tokenJson.refresh_token ?? null,
    expiresAt: tokenJson.expires_in ? Date.now() + tokenJson.expires_in * 1000 : null,
    email,
    displayName: me.displayName ?? null,
  };
}

export async function refreshMicrosoftToken(creds: OAuthCredentials): Promise<OAuthCredentials> {
  if (!creds.refreshToken) return creds;
  if (creds.expiresAt && creds.expiresAt > Date.now() + 60_000) return creds;

  const { clientId, clientSecret, tenant } = microsoftClientConfig();
  const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: creds.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const json = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error_description?: string;
  };
  if (!res.ok || !json.access_token) {
    throw new Error(json.error_description ?? "Failed to refresh Microsoft token");
  }
  return {
    kind: "oauth",
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? creds.refreshToken,
    expiresAt: json.expires_in ? Date.now() + json.expires_in * 1000 : null,
  };
}

function graphMessageToSynced(msg: {
  id: string;
  conversationId: string;
  subject?: string;
  bodyPreview?: string;
  body?: { contentType?: string; content?: string };
  from?: { emailAddress?: { address?: string; name?: string } };
  toRecipients?: { emailAddress?: { address?: string } }[];
  ccRecipients?: { emailAddress?: { address?: string } }[];
  sentDateTime?: string;
  isDraft?: boolean;
}): SyncedMessage {
  const html = msg.body?.contentType === "html" ? msg.body.content ?? null : null;
  const text = msg.body?.contentType === "text" ? msg.body.content ?? null : html ? null : msg.body?.content ?? null;

  return {
    providerMessageId: msg.id,
    providerThreadId: msg.conversationId,
    fromAddress: msg.from?.emailAddress?.address?.toLowerCase() ?? null,
    fromName: msg.from?.emailAddress?.name ?? null,
    toAddresses: (msg.toRecipients ?? [])
      .map((r) => r.emailAddress?.address?.toLowerCase())
      .filter(Boolean) as string[],
    ccAddresses: (msg.ccRecipients ?? [])
      .map((r) => r.emailAddress?.address?.toLowerCase())
      .filter(Boolean) as string[],
    subject: msg.subject ?? null,
    bodyText: text,
    bodyHtml: html ?? (text && text.includes("<") ? text : null),
    sentAt: msg.sentDateTime ?? null,
    isOutbound: false,
    inReplyTo: null,
    snippet: msg.bodyPreview ?? text?.slice(0, 200) ?? null,
  };
}

export async function syncMicrosoftInbox(
  creds: OAuthCredentials,
  syncCursor: string | null,
): Promise<{ messages: SyncedMessage[]; nextCursor: string | null; refreshedCreds: OAuthCredentials }> {
  const refreshedCreds = await refreshMicrosoftToken(creds);
  const headers = { Authorization: `Bearer ${refreshedCreds.accessToken}` };

  const url = syncCursor
    ? `https://graph.microsoft.com/v1.0/me/messages/delta?$deltatoken=${encodeURIComponent(syncCursor)}`
    : "https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages/delta?$top=50";

  const res = await fetch(url, { headers });
  const json = (await res.json()) as {
    value?: Parameters<typeof graphMessageToSynced>[0][];
    "@odata.deltaLink"?: string;
    "@odata.nextLink"?: string;
    error?: { message?: string };
  };
  if (!res.ok) throw new Error(json.error?.message ?? "Failed to sync Microsoft mail");

  const messages = (json.value ?? []).filter((m) => !m.isDraft).map(graphMessageToSynced);
  let nextCursor = syncCursor;
  const deltaLink = json["@odata.deltaLink"];
  if (deltaLink) {
    const token = new URL(deltaLink).searchParams.get("$deltatoken");
    if (token) nextCursor = token;
  }

  return { messages, nextCursor, refreshedCreds };
}

export async function sendMicrosoftReply(
  creds: OAuthCredentials,
  input: { to: string[]; subject: string; bodyText: string },
): Promise<{ providerMessageId: string; refreshedCreds: OAuthCredentials }> {
  const refreshedCreds = await refreshMicrosoftToken(creds);
  const res = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${refreshedCreds.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        subject: input.subject,
        body: { contentType: "Text", content: input.bodyText },
        toRecipients: input.to.map((address) => ({ emailAddress: { address } })),
      },
      saveToSentItems: true,
    }),
  });
  if (!res.ok) {
    const err = (await res.json()) as { error?: { message?: string } };
    throw new Error(err.error?.message ?? "Failed to send Microsoft mail");
  }
  return { providerMessageId: `ms-${Date.now()}`, refreshedCreds };
}
