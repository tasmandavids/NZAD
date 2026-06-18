export type EmailProvider = "gmail" | "microsoft" | "icloud" | "mailru";

export type OAuthCredentials = {
  kind: "oauth";
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number | null;
};

export type ImapCredentials = {
  kind: "imap";
  email: string;
  password: string;
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
};

export type EmailCredentials = OAuthCredentials | ImapCredentials;

export type SyncedMessage = {
  providerMessageId: string;
  providerThreadId: string;
  fromAddress: string | null;
  fromName: string | null;
  toAddresses: string[];
  ccAddresses: string[];
  subject: string | null;
  bodyText: string | null;
  bodyHtml: string | null;
  sentAt: string | null;
  isOutbound: boolean;
  inReplyTo: string | null;
  snippet: string | null;
};

export type EmailAccountRow = {
  id: string;
  studio_id: string;
  provider: EmailProvider;
  email_address: string;
  display_name: string | null;
  credentials_encrypted: string;
  sync_cursor: string | null;
  last_sync_at: string | null;
  sync_error: string | null;
};

export type EmailThreadRow = {
  id: string;
  account_id: string;
  studio_id: string;
  provider_thread_id: string;
  subject: string | null;
  snippet: string | null;
  participant_addresses: string[];
  message_count: number;
  last_message_at: string | null;
  is_read: boolean;
  summary: string | null;
  summary_updated_at: string | null;
};

export type EmailMessageRow = {
  id: string;
  thread_id: string;
  account_id: string;
  from_address: string | null;
  from_name: string | null;
  to_addresses: string[];
  cc_addresses: string[];
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  sent_at: string | null;
  is_outbound: boolean;
};

export const PROVIDER_META: Record<
  EmailProvider,
  { label: string; description: string; oauth: boolean }
> = {
  gmail: {
    label: "Gmail",
    description: "Connect your Google account — syncs your real inbox and sent mail.",
    oauth: true,
  },
  microsoft: {
    label: "Microsoft",
    description: "Outlook, Hotmail, or Microsoft 365 — full mailbox sync.",
    oauth: true,
  },
  icloud: {
    label: "iCloud Mail",
    description: "Use an app-specific password from appleid.apple.com.",
    oauth: false,
  },
  mailru: {
    label: "Mail.ru",
    description: "Connect with your Mail.ru email and password (IMAP).",
    oauth: false,
  },
};

export const IMAP_PRESETS: Record<"icloud" | "mailru", Omit<ImapCredentials, "kind" | "email" | "password">> = {
  icloud: {
    imapHost: "imap.mail.me.com",
    imapPort: 993,
    smtpHost: "smtp.mail.me.com",
    smtpPort: 587,
  },
  mailru: {
    imapHost: "imap.mail.ru",
    imapPort: 993,
    smtpHost: "smtp.mail.ru",
    smtpPort: 465,
  },
};
