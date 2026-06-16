<<<<<<< HEAD
# Git Integration & Wix CLI <img align="left" src="https://user-images.githubusercontent.com/89579857/185785022-cab37bf5-26be-4f11-85f0-1fac63c07d3b.png">

This repo is part of Git Integration & Wix CLI, a set of tools that allows you to write, test, and publish code for your Wix site locally on your computer. 

Connect your site to GitHub, develop in your favorite IDE, test your code in real time, and publish your site from the command line.

## Set up this repository in your IDE
This repo is connected to a Wix site. That site tracks this repo's default branch. Any code committed and pushed to that branch from your local IDE appears on the site.

Before getting started, make sure you have the following things installed:
* [Git](https://git-scm.com/download)
* [Node](https://nodejs.org/en/download/), version 14.8 or later.
* [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) or [yarn](https://yarnpkg.com/getting-started/install)
* An SSH key [added to your GitHub account](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/adding-a-new-ssh-key-to-your-github-account).

To set up your local environment and start coding locally, do the following:

1. Open your terminal and navigate to where you want to store the repo.
1. Clone the repo by running `git clone <your-repository-url>`.
1. Navigate to the repo's directory by running `cd <directory-name>`.
1. Install the repo's dependencies by running `npm install` or `yarn install`.
1. Install the Wix CLI by running `npm install -g @wix/cli` or `yarn global add @wix/cli`.  
   Once you've installed the CLI globally, you can use it with any Wix site's repo.

For more information, see [Setting up Git Integration & Wix CLI](https://support.wix.com/en/article/velo-setting-up-git-integration-wix-cli-beta).

## Write Velo code in your IDE
Once your repo is set up, you can write code in it as you would in any other non-Wix project. The repo's file structure matches the [public](https://support.wix.com/en/article/velo-working-with-the-velo-sidebar#public), [backend](https://support.wix.com/en/article/velo-working-with-the-velo-sidebar#backend), and [page code](https://support.wix.com/en/article/velo-working-with-the-velo-sidebar#page-code) sections in Editor X.

Learn more about [this repo's file structure](https://support.wix.com/en/article/velo-understanding-your-sites-github-repository-beta).

## Test your code with the Local Editor
The Local Editor allows you test changes made to your site in real time. The code in your local IDE is synced with the Local Editor, so you can test your changes before committing them to your repo. You can also change the site design in the Local Editor and sync it with your IDE.

Start the Local Editor by navigating to this repo's directory in your terminal and running `wix dev`.

For more information, see [Working with the Local Editor](https://support.wix.com/en/article/velo-working-with-the-local-editor-beta).

## Preview and publish with the Wix CLI
The Wix CLI is a tool that allows you to work with your site locally from your computer's terminal. You can use it to build a preview version of your site and publish it. You can also use the CLI to install [approved npm packages](https://support.wix.com/en/article/velo-working-with-npm-packages) to your site.

Learn more about [working with the Wix CLI](https://support.wix.com/en/article/velo-working-with-the-wix-cli-beta).

## Invite contributors to work with you
Git Integration & Wix CLI extends Editor X's [concurrent editing](https://support.wix.com/en/article/editor-x-about-concurrent-editing) capabilities. Invite other developers as collaborators on your [site](https://support.wix.com/en/article/inviting-people-to-contribute-to-your-site) and your [GitHub repo](https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-personal-account-on-github/managing-access-to-your-personal-repositories/inviting-collaborators-to-a-personal-repository). Multiple developers can work on a site's code at once.
=======
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
(Settings → API).

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
>>>>>>> a59226f (Initial commit)
