# Olune test accounts

> **Testing only.** Rotate or remove these credentials before a public launch.

## Platform + studio admin

One account with access to both the Olune operator console and a demo studio.

| Field | Value |
|-------|-------|
| **Email** | `platform-admin@olune.test` |
| **Password** | `testadmin123` |

### After sign-in

| Console | URL |
|---------|-----|
| Olune platform (cross-tenant) | `/platform` |
| Demo studio admin | `/portal/admin` |
| Demo studio public site | `demo.localhost:3000` (dev) or `demo.olune.app` (prod) |

## One-time setup (required)

The account must be created in Supabase once per environment:

```bash
# 1. Apply migrations (if not already)
npm run db:push
```

If you see `gen_random_bytes does not exist` on an old local file named
`0026_studio_member_registration.sql`, **delete that file** and pull the latest
`0027_studio_member_registration.sql` from the repo instead.

```bash
# 2. Create the user (needs service role key in .env.local)
npm run seed:platform-admin
# or: node --env-file=.env.local scripts/seed-platform-admin.mjs
```

The seed script lives on branch `cursor/platform-admin-system-d1b9` (or `main` after merge).
If you get `Cannot find module .../seed-platform-admin.mjs`, run `git pull` first.

### Vercel / production

1. Add env var: `PLATFORM_OPERATOR_EMAILS=platform-admin@olune.test`
2. Run the seed script locally against your **production** Supabase project (same URL + service role key from prod dashboard), **or** run it from any machine with those env vars set.

The script is idempotent — safe to re-run. It resets the password to `testadmin123` and ensures operator + demo studio links.

## What the seed script creates

- Auth user (email confirmed)
- `platform_operators` row → access to `/platform/*`
- Demo studio **Demo Studio** (`slug: demo`) → access to `/portal/admin`
- Default branding row for the demo studio
