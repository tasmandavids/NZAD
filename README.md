# Olune

A multi-tenant, white-label studio platform (built for dance schools). One
codebase serves many studios — each with its own isolated data, subdomain, and
brand. Stack: **Next.js 15 (App Router) · Supabase (Postgres + Auth + RLS) ·
Tailwind v4 · Framer Motion · React Three Fiber**.

> This is a working foundation, not a finished product. See **Status** below for
> exactly what's built vs. stubbed.

## What's in here

```
olune/
├─ middleware.ts                     role-based routing → /portal/<role>
├─ app/
│  ├─ layout.tsx                     injects the tenant's brand tokens + fonts
│  ├─ template.tsx                   replays the curtain page-transition
│  ├─ globals.css                    Tailwind v4 tokens → CSS variables
│  ├─ page.tsx                       marketing landing (Hero + particle field)
│  ├─ login/page.tsx                 starter sign-in
│  ├─ onboarding/page.tsx            "Start your studio" wizard (provisions)
│  └─ portal/
│     ├─ admin/page.tsx              God-mode dashboard (stats · heatmap · DnD)
│     ├─ admin/branding/             Appearance editor + save action
│     ├─ student|parent|teacher/     stubs (routing works; UI pending)
├─ components/
│  ├─ marketing/Hero.tsx
│  ├─ landing/ParticleBackground.tsx
│  ├─ transitions/PageTransition.tsx
│  ├─ onboarding/OnboardingWizard.tsx
│  └─ admin/{BrandingEditor, dashboard/*}
├─ lib/
│  ├─ types.ts · branding.ts · tenant.ts
│  └─ supabase/{server.ts, client.ts}
├─ styles/micro-interactions.css     scrollbars · glow buttons · focus states
├─ supabase/
│  ├─ migrations/0001_tenant_branding.sql
│  ├─ migrations/0002_core_tables_and_rls.sql
│  └─ seed.sql                       optional sample data
└─ previews/                         standalone HTML demos — open in a browser
```

## Setup (~15 min)

**1. Install.**
```bash
npm install          # if you hit React-19 peer warnings: npm install --legacy-peer-deps
```

**2. Create a Supabase project** at supabase.com and copy its URL + anon key
(Settings → API). (For local development you can instead run the full stack with
the Supabase CLI: `supabase start` — see `AGENTS.md`.)

**3. Env.** Copy `.env.local.example` → `.env.local` and fill it in. Keep
`NEXT_PUBLIC_ROOT_DOMAIN=localhost` for development.

**4. Apply the schema.** Paste, in order, into Supabase Studio → SQL editor:
`supabase/migrations/0001_tenant_branding.sql`, then
`supabase/migrations/0002_core_tables_and_rls.sql`.
(Or `supabase db push` if you use the CLI.)

**5. Turn off email confirmation for dev** (Supabase → Authentication →
Providers → Email) so the wizard flows straight through.

**6. Run.**
```bash
npm run dev
```

## First run

1. Visit **http://localhost:3000/onboarding** → create an account, name your
   studio, claim a subdomain, pick a brand. You land in `/portal/admin` as the
   owner. (`*.localhost` resolves automatically in modern browsers, so your
   studio's canonical URL is e.g. `http://nzad.localhost:3000`.)
2. Open **Appearance**, change the brand colour, Save — the app reskins.
3. (Optional) Add a few users in Supabase Studio → Auth, then run
   `supabase/seed.sql` (paste your studio id + the user UUIDs) to populate
   sample classes, an enrolment, and a paid invoice so the dashboard shows data.

## Test the security model

Log in as one user per role and confirm each sees only their own data — RLS
failures are *silent* (fewer rows, never an error), so this pass is the real
test. A parent must never see another family's invoice; a non-admin hitting
`/portal/admin` must bounce to their own portal.

## Deploy (public URL)

Push to GitHub → import to Vercel → set the same env vars (with
`NEXT_PUBLIC_ROOT_DOMAIN=yourdomain.com`). Then:
- Add `*.yourdomain.com` as a **wildcard domain** in Vercel + a wildcard DNS
  CNAME — multi-tenant subdomains need a real domain (a free `*.vercel.app`
  won't do wildcards).
- Supabase → Authentication → URL Configuration: set Site URL + redirect URLs.
- For the apex-signup → subdomain-dashboard handoff to keep the session, scope
  Supabase auth cookies to the parent domain (`.yourdomain.com`).

## Status

**Built:** tenant + branding backbone with DB-enforced isolation (RLS) · core
tables (profiles, classes, enrollments, invoices, guardianships) · role-based
middleware routing · onboarding wizard · admin dashboard UI (animated stats,
capacity heatmap, drag-and-drop schedule builder) · branding/Appearance editor ·
marketing hero + WebGL particle field · page transitions · premium
micro-interactions.

**Not yet (roadmap):** student/parent/teacher portals (stubs only) · Stripe
Connect billing · Xero sync · bulk messaging + bulk invoicing · a `class_capacity`
SQL view (the heatmap currently uses mock data) · a shared portal shell/nav ·
per-portal role-guard layouts · studio settings + custom-domain management.
