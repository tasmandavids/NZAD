# AGENTS.md

## Cursor Cloud specific instructions

Olune is a single Next.js 15 (App Router) app — a multi-tenant, white-label
studio-management platform. Its one hard dependency is **Supabase** (Postgres +
Auth + RLS + Realtime + Storage), which is run **locally** via the Supabase CLI
(Docker). Stripe is optional (billing/shop/events flows only). Standard scripts
live in `package.json` (`dev`, `build`, `start`, `lint`); DB schema is in
`supabase/migrations/`.

### Starting the environment (services are NOT auto-started)

The update script only refreshes npm deps. Each session, start the services:

1. **Docker daemon** (no systemd here): `sudo dockerd > /tmp/dockerd.log 2>&1 &`
   then `sudo chmod 666 /var/run/docker.sock` so the CLI can reach it. Skip if
   `docker info` already works.
2. **Local Supabase stack:** `supabase start` (from repo root; reads
   `supabase/config.toml`). First run pulls images; later runs are fast. Keys/URLs:
   `supabase status`. Apply schema changes with `supabase db reset` (re-runs all
   migrations) or `supabase migration up`.
3. **Dev server:** `npm run dev` (http://localhost:3000). Lint: `npm run lint`.

`.env.local` (gitignored) already points at the local stack using the standard
local-dev demo keys. If it's missing, recreate it with
`NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`, the local `ANON_KEY` /
`SERVICE_ROLE_KEY` from `supabase status`, `NEXT_PUBLIC_ROOT_DOMAIN=localhost`,
and placeholder `STRIPE_*` keys.

### Non-obvious caveats

- **Test on `http://localhost:3000`, NOT on `*.localhost` subdomains.** Multi-tenant
  studios resolve from a subdomain (`<slug>.localhost:3000`), but the Supabase
  auth cookie set on `localhost` is not sent to subdomains in dev (parent-domain
  cookie scoping is only configured for production), so subdomain portals look
  like a redirect loop / logged-out. The onboarding flow correctly lands you on
  `localhost:3000/portal/admin`.
- **Don't navigate to bare `/portal`.** The middleware matcher (`/portal/:path*`)
  doesn't cover bare `/portal`, and the login page defaults its post-login target
  to `/portal`, which 404s. Go to `/portal/admin` (or finish onboarding, which
  redirects there) instead.
- **`supabase/config.toml` has two important deviations from `supabase init` defaults:**
  `auto_expose_new_tables = true` (the migrations were written for legacy Supabase
  that auto-grants public tables to the API roles; without it the `studios` table
  has no `SELECT` grant and the portal layout's `studios(name)` join fails with
  "permission denied for table studios", causing a `/portal` ↔ `/onboarding` loop),
  and `[db.seed] enabled = false` (`supabase/seed.sql` is a hand-edit template
  requiring real studio/user UUIDs, so it can't seed unattended).
- **Saving branding briefly shows a black screen with a spinning 3D cube** — that's
  the app's WebGL page transition (`ParticleBackground` + `template.tsx`), not a
  hang. The "Branding saved — your site is live" confirmation follows.
- `npm run lint` uses the Next.js linter and surfaces pre-existing style findings
  (unescaped entities, `<a>`-vs-`<Link>`); these are not setup issues.
- The app lives in `app/`, `components/`, `lib/`, `supabase/`. (Earlier Wix-template
  boilerplate — `wix.config.json`, `wix.lock`, `src/` stubs — has been removed.)
