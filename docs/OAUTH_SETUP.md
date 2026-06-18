# Google & Apple OAuth setup

Olune uses Supabase Auth with a Next.js callback at `/auth/callback`.

**Supabase project:** `wnoxcwihrzbxvogvmhqv`  
**Supabase OAuth callback (use in Google + Apple consoles):**

```
https://wnoxcwihrzbxvogvmhqv.supabase.co/auth/v1/callback
```

---

## 1. Redirect URLs (Supabase)

Run the setup script (uses `SUPABASE_ACCESS_TOKEN` from `.env.local`):

```bash
node --env-file=.env.local scripts/setup-oauth.mjs
```

This adds:

- `http://localhost:3000/auth/callback`
- `http://127.0.0.1:3000/auth/callback`
- Production URLs when `NEXT_PUBLIC_APP_URL` or `NEXT_PUBLIC_ROOT_DOMAIN` is set

---

## 2. Google

### A. Google Cloud Console

1. Open [Google Cloud Credentials](https://console.cloud.google.com/apis/credentials)
2. Create **OAuth client ID** → type **Web application**
3. **Authorized JavaScript origins**
   - `http://localhost:3000`
   - Your production URL (e.g. `https://olune.app`)
4. **Authorized redirect URIs**
   - `https://wnoxcwihrzbxvogvmhqv.supabase.co/auth/v1/callback`
5. Copy **Client ID** and **Client secret**

### B. Enable in Supabase

Add to `.env.local`:

```env
GOOGLE_OAUTH_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=your-client-secret
```

Then run:

```bash
node --env-file=.env.local scripts/setup-oauth.mjs --enable-google
```

Or paste credentials in [Supabase → Auth → Providers → Google](https://supabase.com/dashboard/project/wnoxcwihrzbxvogvmhqv/auth/providers).

---

## 3. Apple

Apple requires a paid Apple Developer account.

### A. Apple Developer

1. [Identifiers → App IDs](https://developer.apple.com/account/resources/identifiers/list) — create an App ID with **Sign in with Apple**
2. [Identifiers → Services IDs](https://developer.apple.com/account/resources/identifiers/list/serviceId) — create a Services ID (this is your `client_id`)
3. Configure **Sign in with Apple** on the Services ID:
   - Primary App ID: your App ID
   - **Return URL:** `https://wnoxcwihrzbxvogvmhqv.supabase.co/auth/v1/callback`
4. [Keys](https://developer.apple.com/account/resources/authkeys/list) — create a key with **Sign in with Apple**
5. Generate the client secret JWT (Supabase dashboard has a helper, or use their docs)

### B. Enable in Supabase

Add to `.env.local`:

```env
APPLE_OAUTH_CLIENT_ID=com.yourco.olune.web
APPLE_OAUTH_CLIENT_SECRET=your-generated-jwt-secret
```

Then run:

```bash
node --env-file=.env.local scripts/setup-oauth.mjs --enable-apple
```

Apple secrets expire every 6 months — regenerate before expiry.

---

## 4. Test locally

```bash
npm run dev
```

1. Visit `http://localhost:3000/login`
2. Click **Continue with Google** or **Continue with Apple**
3. After auth you should land in `/portal` (existing user) or `/onboarding` (new user)

---

## Troubleshooting

| Symptom | Fix |
|--------|-----|
| `redirect_uri_mismatch` | Google/Apple redirect URI must be the **Supabase** callback URL, not `/auth/callback` |
| Bounced back to login | Check redirect URLs in Supabase include `http://localhost:3000/auth/callback` |
| New user stuck | Should redirect to `/onboarding` — profile is created by `handle_new_user` trigger |
