# Gmail inbox setup (connected email)

The admin **Communications → Email** page syncs your **real Gmail inbox** via the Gmail API. This is separate from Google **login** OAuth (Supabase Auth).

## 1. Google Cloud Console

Use the same Google Cloud project as login OAuth, or create a dedicated one.

### Enable Gmail API

1. [Gmail API](https://console.cloud.google.com/apis/library/gmail.googleapis.com) → **Enable**

### OAuth consent screen

1. [OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent)
2. Add scopes (if not already present):
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/gmail.modify`
3. If the app is in **Testing**, add your Gmail address under **Test users**

### OAuth client (Web application)

1. [Credentials](https://console.cloud.google.com/apis/credentials) → your Web client (or create one)
2. **Authorized JavaScript origins**
   - `http://localhost:3000`
3. **Authorized redirect URIs** — add **both**:
   - `http://localhost:3000/api/email/oauth/google/callback` (local dev)
   - `https://www.olune.co.nz/api/email/oauth/google/callback` (production)
   - Keep existing Supabase login callback if present: `https://wnoxcwihrzbxvogvmhqv.supabase.co/auth/v1/callback`
4. **Authorized JavaScript origins** (if shown):
   - `http://localhost:3000`
   - `https://www.olune.co.nz`

Direct link to edit your email OAuth client:

https://console.cloud.google.com/auth/clients/178044438344-v69e94ktvrs1akiuks5stml3kd0n0l55.apps.googleusercontent.com?project=178044438344

Copy **Client ID** and **Client secret** into `.env.local`:

```bash
# Can reuse login credentials or use dedicated mail client:
GOOGLE_MAIL_CLIENT_ID=...
GOOGLE_MAIL_CLIENT_SECRET=...

# Fallback if GOOGLE_MAIL_* unset — uses GOOGLE_OAUTH_*:
# GOOGLE_OAUTH_CLIENT_ID=...
# GOOGLE_OAUTH_CLIENT_SECRET=...
```

Also required:

```bash
EMAIL_TOKEN_ENCRYPTION_KEY=...   # long random string
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 2. Database

```bash
npm run db:push
```

Applies migration `0033_email_inbox.sql` (`email_accounts`, `email_threads`, `email_messages`).

## 3. Test locally

```bash
npm run dev
```

1. Sign in as a **studio admin**
2. Open **Communications → Email**
3. Click **Gmail → Connect with OAuth**
4. Approve Gmail access
5. You should land back on `/portal/admin/email?connected=gmail` with sync starting
6. Click **Sync now** if the inbox is empty
7. Open a thread — HTML should match your Gmail message
8. **Send reply** — check Gmail Sent folder; reply should come from your connected address

## Troubleshooting

| Error | Fix |
|-------|-----|
| `redirect_uri_mismatch` | Add exact callback URL in Google Cloud redirect URIs |
| `access_denied` | Add your Google account as a Test user on consent screen |
| `Gmail API has not been used...` | Enable Gmail API in the project |
| `GOOGLE_MAIL_CLIENT_ID... required` | Set `GOOGLE_MAIL_*` or `GOOGLE_OAUTH_*` in `.env.local` |
| `EMAIL_TOKEN_ENCRYPTION_KEY... required` | Add a random secret to `.env.local` |
| Empty inbox after connect | Click **Sync now**; check account row `sync_error` in Supabase |
| OAuth works but sync fails | Token may lack scopes — disconnect and reconnect after adding Gmail scopes |

## Production

- Add production redirect URI to Google OAuth client
- Set `NEXT_PUBLIC_APP_URL=https://your-domain.com`
- Cron `/api/cron/sync-email` runs every 15 minutes (uses `CRON_SECRET`)
