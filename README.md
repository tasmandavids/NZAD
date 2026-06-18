# Olune

A multi-tenant, white-label studio platform (built for dance schools). One
codebase serves many studios — each with its own isolated data, subdomain, and
brand. Stack: **Next.js 15 (App Router) · Supabase (Postgres + Auth + RLS) ·
Tailwind v4 · Framer Motion · React Three Fiber**.

> See **OLUNE_PROGRESS.md** for a detailed build log.

## What's in here

```
olune/
├─ middleware.ts                     role-based routing → /portal/<role>
├─ app/                              App Router pages + API routes
├─ components/                       UI (admin, site builder, marketing)
├─ lib/                              branding, tenant, stripe, site blocks
├─ supabase/
│  ├─ config.toml                    CLI + GitHub integration config
│  ├─ migrations/0001–0025.sql       schema (applied via GitHub or db push)
│  └─ seed.sql                       optional sample data (local reset only)
└─ tests/                            vitest unit + integration tests
```

## Setup (~15 min)

**1. Install**

```bash
npm install
```

**2. Supabase project**

Create a project at [supabase.com](https://supabase.com) (or use the linked
production project). Copy URL + anon key from **Settings → API**.

**3. Environment**

```bash
cp .env.local.example .env.local
```

Fill in at minimum:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (required for student invites, image uploads, crons)
- `NEXT_PUBLIC_ROOT_DOMAIN=localhost` for local dev

**4. Database migrations**

Choose one:

| Method | When to use |
|--------|-------------|
| **GitHub integration** (recommended) | Connect the repo in Supabase Dashboard → Integrations → GitHub. Migrations in `supabase/migrations/` deploy when you push/merge to `main`. |
| **CLI** | Local development or one-off sync: `npm run db:push` |

First-time CLI setup:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npm run db:push
```

**5. Auth (dev)** — Supabase → Authentication → Providers → Email: disable
email confirmation so onboarding flows straight through.

**6. Run**

```bash
npm run dev
```

Visit **http://localhost:3000/onboarding** to create a studio. Preview the public
site at **http://YOUR-SLUG.localhost:3000** (not plain `localhost`).

## Supabase + GitHub workflow

After connecting GitHub in the Supabase dashboard:

1. Set **production branch** to `main` (or your deploy branch).
2. Enable **Deploy to production** so new migration files apply automatically.
3. Add new schema changes as `supabase/migrations/0026_description.sql`.
4. Commit and push — Supabase runs pending migrations on merge.

Do **not** edit production schema in the SQL editor without adding a matching
migration file, or GitHub deploys will drift.

CLI helpers (optional):

```bash
npm run db:status   # compare local vs remote migration history
npm run db:push     # apply pending migrations to linked project
```

For CLI auth errors, run `npx supabase login` or set `SUPABASE_ACCESS_TOKEN`
from [Account → Access Tokens](https://supabase.com/dashboard/account/tokens).

## Deploy (Vercel)

Push to GitHub → import to Vercel → set the same env vars with
`NEXT_PUBLIC_ROOT_DOMAIN=yourdomain.com`.

- Add `*.yourdomain.com` as a wildcard domain in Vercel + DNS.
- Supabase → Authentication → URL Configuration: Site URL + redirect URLs.
- Scope auth cookies to `.yourdomain.com` for subdomain portal handoff.

Vercel crons (see `vercel.json`) require `CRON_SECRET` and
`SUPABASE_SERVICE_ROLE_KEY` in production.

## Test

```bash
npm test                  # unit tests
npm run test:integration  # needs local Supabase + seed (see STAGING_AUDIT.md)
```
